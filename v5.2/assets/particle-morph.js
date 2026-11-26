/* ParticleMorph — images as particles, flowing one into the next.
   The engine block of Moxx Lab's particle-morph.html (Nov 2026), lifted out
   unchanged so the site can use it: ParticleMorph(canvas, { images:[src…],
   settings:{…} }) → api { goto(i), next(), prev(), set(k, v), state(), … }.
   WebGL 2; returns null where there is none. Used by the MVP design page's
   steps (assets/mvp-steps.js). */
/* ParticleMorph(canvas, { images:[src…], overrides:[…], settings:{…}, onState, onQuality }) — the whole effect, with no
   dependency on this page, so the Export panel can ship this block as it is.
   Parts: sampling (image → particles) → arrangement (which particle goes where) → GL → timeline → hover springs → frame. */
function ParticleMorph(canvas, opts){
  opts = opts || {};
  var P = Object.assign({}, ParticleMorph.DEFAULTS, opts.settings || {});
  var gl = canvas.getContext('webgl2', { alpha:true, premultipliedAlpha:true, antialias:false, preserveDrawingBuffer:true });
  if (!gl) return null;
  var clamp = function(v,a,b){ return v<a?a:v>b?b:v; }, TAU = Math.PI*2;
  function rng(seed){ var a = seed>>>0; return function(){ a |= 0; a = a+0x6D2B79F5|0; var t = Math.imul(a^a>>>15, 1|a); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  var hex = function(h){ h = /^#[0-9a-f]{6}$/i.test(h) ? h : '#ffffff'; return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255]; };

  /* ---------------- sampling: an image becomes n points with a colour each */
  var work = document.createElement('canvas'), wg = work.getContext('2d', { willReadFrequently:true });
  function sample(it){
    var im = it.el, iw = im.naturalWidth || im.width || 400, ih = im.naturalHeight || im.height || 400, m = 420/Math.max(iw, ih), w = Math.max(2, Math.round(iw*m)), h = Math.max(2, Math.round(ih*m));
    work.width = w; work.height = h; wg.clearRect(0, 0, w, h); wg.drawImage(im, 0, 0, w, h);
    var d = wg.getImageData(0, 0, w, h).data, n = w*h, wt = new Float32Array(n), total = 0, clear = 0, i;
    for (i = 0; i < n; i++) if (d[i*4+3] < 250) clear++;
    var hasAlpha = clear > n*.02, cs = [0, w-1, (h-1)*w, n-1], br = 0, bg = 0, bb = 0;
    for (i = 0; i < 4; i++){ br += d[cs[i]*4]/4; bg += d[cs[i]*4+1]/4; bb += d[cs[i]*4+2]/4; }
    var useBg = P.bgMode === 'colour' || (P.bgMode === 'auto' && !hasAlpha), thr = P.threshold;
    for (i = 0; i < n; i++){ var a = d[i*4+3]/255, r = d[i*4], g = d[i*4+1], b = d[i*4+2], tone;
      if (a < Math.max(.04, hasAlpha ? thr : .04)) continue;
      if (useBg){ tone = Math.min(1, Math.hypot(r-br, g-bg, b-bb)/300); if (tone < thr) continue; } else tone = (r*.299+g*.587+b*.114)/255;
      if (P.invert) tone = 1-tone;
      var wv = a*(1-P.tone + P.tone*Math.pow(tone, 1.4)); if (wv <= .004) continue; wt[i] = wv; total += wv; }
    var count = Math.max(1, P.count|0), R = rng(it.seed), ax = w/Math.max(w, h), ay = h/Math.max(w, h), xs, ys, col, lum, k = 0, px;
    function put(p, jx, jy){ var x = p%w, y = (p/w)|0; xs[k] = ((x+jx)/w-.5)*2*ax; ys[k] = -((y+jy)/h-.5)*2*ay; col[k*4] = d[p*4]; col[k*4+1] = d[p*4+1]; col[k*4+2] = d[p*4+2]; col[k*4+3] = 255; lum[k] = (d[p*4]*.299+d[p*4+1]*.587+d[p*4+2]*.114)/255; k++; }
    if (!(total > 0)){ xs = new Float32Array(1); ys = new Float32Array(1); col = new Uint8Array(4); lum = new Float32Array(1); return { n:1, x:xs, y:ys, col:col, lum:lum }; }
    if (P.sampling === 'grid'){ var valid = 0; for (i = 0; i < n; i++) if (wt[i] > 0) valid++;
      var step = Math.max(.35, Math.sqrt(valid/count)), cap = Math.ceil(valid/(step*step)*1.3)+16; xs = new Float32Array(cap); ys = new Float32Array(cap); col = new Uint8Array(cap*4); lum = new Float32Array(cap);
      for (var gy = step/2; gy < h; gy += step) for (var gx = step/2; gx < w; gx += step){ px = (gy|0)*w + (gx|0); if (wt[px] > 0 && k < cap) put(px, gx-(gx|0), gy-(gy|0)); } }
    else { var cdf = new Float32Array(n), acc = 0; for (i = 0; i < n; i++){ acc += wt[i]; cdf[i] = acc; }                 /* stipple: more points where the picture is brighter */
      xs = new Float32Array(count); ys = new Float32Array(count); col = new Uint8Array(count*4); lum = new Float32Array(count);
      for (i = 0; i < count; i++){ var t = R()*acc, lo = 0, hi = n-1; while (lo < hi){ var mid = (lo+hi)>>1; if (cdf[mid] < t) lo = mid+1; else hi = mid; } put(lo, R(), R()); } }
    return { n:k, x:xs.subarray(0, k), y:ys.subarray(0, k), col:col.subarray(0, k*4), lum:lum.subarray(0, k) };
  }

  /* ---------------- arrangement: lay an image's points into N slots, in an order chosen by the mapping mode */
  function arrange(it, mode){
    var key = mode+'|'+N+'|'+P.extras, hit = it.arr[key]; if (hit) return hit;
    var s = it.samp, n = s.n, ord = new Uint32Array(n), kv = new Float32Array(n), i, R = rng(it.seed+17);
    for (i = 0; i < n; i++){ ord[i] = i; var x = s.x[i], y = s.y[i];
      if (mode === 'nearest'){ var qx = clamp((x*.5+.5)*1023|0, 0, 1023), qy = clamp((y*.5+.5)*1023|0, 0, 1023), mc = 0; for (var b = 0; b < 10; b++) mc += ((qx>>b&1) + (qy>>b&1)*2)*Math.pow(4, b); kv[i] = mc; }
      else if (mode === 'bright') kv[i] = s.lum[i] + R()*.002; else if (mode === 'sweep') kv[i] = x; else if (mode === 'centre') kv[i] = Math.hypot(x, y); else kv[i] = R(); }
    ord.sort(function(a, b){ return kv[a]-kv[b]; });
    var pos = new Float32Array(N*2), col = new Uint8Array(N*4), dly = new Float32Array(N), filled = new Uint8Array(N), slot;
    for (i = 0; i < n; i++){ slot = Math.floor(i*N/n); var p = ord[i]; pos[slot*2] = s.x[p]; pos[slot*2+1] = s.y[p]; col.set(s.col.subarray(p*4, p*4+4), slot*4); filled[slot] = 1; }
    var lx = pos[0], ly = pos[1], lc = [col[0], col[1], col[2]];
    for (slot = 0; slot < N; slot++){ if (filled[slot]){ lx = pos[slot*2]; ly = pos[slot*2+1]; lc = [col[slot*4], col[slot*4+1], col[slot*4+2]]; }
      else { if (P.extras === 'scatter'){ var a = R()*TAU, rr = 2.4+R()*1.2; pos[slot*2] = Math.cos(a)*rr; pos[slot*2+1] = Math.sin(a)*rr; } else { pos[slot*2] = lx; pos[slot*2+1] = ly; }   /* spare particles: invisible here, parked on a neighbour or off-screen */
        col[slot*4] = lc[0]; col[slot*4+1] = lc[1]; col[slot*4+2] = lc[2]; col[slot*4+3] = 0; }
      var X = pos[slot*2], Y = pos[slot*2+1]; dly[slot] = mode === 'sweep' ? clamp(X*.5+.5, 0, 1) : mode === 'centre' ? clamp(Math.hypot(X, Y)/1.3, 0, 1) : R(); }
    return it.arr[key] = { pos:pos, col:col, dly:dly };
  }

  /* ---------------- GL */
  var VS = '#version 300 es\nprecision highp float;\n' +
    'layout(location=0) in vec2 aA; layout(location=1) in vec2 aB; layout(location=2) in vec4 aCA; layout(location=3) in vec4 aCB; layout(location=4) in float aKey; layout(location=5) in vec4 aRnd; layout(location=6) in vec2 aOff;\n' +
    'uniform float uT,uStagger,uTime,uAmp,uSize,uSizeVar,uJitter,uDpr,uOpacity,uGlow,uMagR,uMag; uniform int uStyle,uColorMode,uEase; uniform vec2 uScale,uShift,uMouse; uniform vec3 uC1,uC2; uniform vec4 uBez;\n' +
    'float ease(float t){ if(uEase==0) return t;\n' +
    ' if(uEase==2) return (t<=0.||t>=1.) ? t : pow(2.,-9.*t)*sin((t*8.-.75)*2.0943951)+1.;\n' +
    ' if(uEase==3){ float u = t-1.; return 1.+2.9*u*u*u+1.9*u*u; }\n' +
    ' if(uEase==4){ float x = t; for(int i=0;i<6;i++){ float cx = 3.*uBez.x*x*(1.-x)*(1.-x)+3.*uBez.z*x*x*(1.-x)+x*x*x-t, dx = 3.*uBez.x*(1.-x)*(1.-3.*x)+3.*uBez.z*x*(2.-3.*x)+3.*x*x; if(abs(dx)<1e-5) break; x = clamp(x-cx/dx,0.,1.); } return 3.*uBez.y*x*(1.-x)*(1.-x)+3.*uBez.w*x*x*(1.-x)+x*x*x; }\n' +
    ' return t<.5 ? 4.*t*t*t : 1.-pow(-2.*t+2.,3.)/2.; }\n' +
    'out vec4 vCol;\n' +
    'vec2 flow(vec2 p,float t){ return vec2(sin(p.y*3.1+t)+.5*sin(p.y*7.3-t*1.3+p.x*2.), cos(p.x*2.7-t*.8)+.5*cos(p.x*6.1+t*1.1+p.y*3.)); }\n' +
    'void main(){\n' +
    ' float lin = clamp(uT*(1.+uStagger)-aKey*uStagger,0.,1.), e = ease(lin), p = clamp(e,0.,1.), bell = sin(3.14159265*lin);\n' +
    ' vec2 pos = mix(aA,aB,e);\n' +
    ' if(uStyle==1){ pos += normalize(aRnd.xy-.5+1e-4)*(.25+aRnd.z)*uAmp*1.3*bell; }\n' +
    ' else if(uStyle==2){ float a = uAmp*7.*bell*(1.25-min(length(pos),1.2))*(.55+.45*aRnd.x), c = cos(a), s = sin(a); pos = mat2(c,s,-s,c)*pos*(1.-.3*bell*uAmp); }\n' +
    ' else if(uStyle==3){ pos += flow(pos*1.6+aRnd.xy*.5,uTime*.7)*uAmp*.3*bell + (aRnd.xy-.5)*uAmp*.3*bell; }\n' +
    ' else if(uStyle==4){ float q; if(p<.5){ q = p*2.; pos = aA+vec2((aRnd.x-.5)*.35*q, -(2.2+aRnd.y*1.6)*q*q*max(uAmp,.15)*1.4); } else { q = 1.-(p-.5)*2.; pos = aB+vec2((aRnd.z-.5)*.35*q, (2.2+aRnd.w*1.6)*q*q*max(uAmp,.15)*1.4); } }\n' +
    ' pos += vec2(sin(uTime*(1.+aRnd.x*2.)+aRnd.y*40.), cos(uTime*(1.3+aRnd.z*2.)+aRnd.w*40.))*uJitter*.012;\n' +
    ' pos += aOff;\n' +
    ' float ct = uColorMode==3 ? p : smoothstep(.35,.65,p); vec4 c = mix(aCA,aCB,ct); c.a = mix(aCA.a,aCB.a,p);\n' +
    ' if(uColorMode==1) c.rgb = uC1; else if(uColorMode==2) c.rgb = mix(uC2,uC1,clamp(pos.y*.5+.5,0.,1.));\n' +
    ' vCol = vec4(c.rgb,c.a*uOpacity);\n' +
    ' float mag = 1.+uMag*smoothstep(uMagR,0.,distance(pos,uMouse));\n' +
    ' gl_Position = vec4(pos*uScale+uShift,0.,1.);\n' +
    ' gl_PointSize = max(1., uSize*(1.+uSizeVar*(aRnd.w*2.-1.))*uDpr*mag*(1.+uGlow*2.));\n' +
    '}';
  var FS = '#version 300 es\nprecision highp float;\nin vec4 vCol; out vec4 o; uniform int uShape; uniform float uGlow; uniform sampler2D uSprite;\n' +
    'void main(){ vec2 q = gl_PointCoord*2.-1.; float k = 1.+uGlow*2., d, a; vec2 s = q*k;\n' +
    ' if(uShape==1) d = max(abs(s.x),abs(s.y)); else if(uShape==2) d = abs(s.x)+abs(s.y); else if(uShape==3){ float an = atan(s.x,-s.y), r = length(s); d = r/(.62+.38*cos(an*5.)); } else if(uShape==4) d = abs(length(s)-.7)*3.3; else d = length(s);\n' +
    ' if(uShape==5) a = (abs(s.x)<=1. && abs(s.y)<=1.) ? texture(uSprite,s*.5+.5).a : 0.; else a = 1.-smoothstep(.82,1.,d);\n' +
    ' a = max(a, uGlow*.55*exp(-dot(q,q)*3.2)*(1.-smoothstep(.8,1.,length(q))));\n' +
    ' if(a<.003) discard; o = vec4(vCol.rgb*vCol.a*a, vCol.a*a); }';
  var QV = '#version 300 es\nvoid main(){ vec2 p = vec2(float(gl_VertexID%2)*4.-1., float(gl_VertexID/2)*4.-1.); gl_Position = vec4(p,0.,1.); }';
  var QF = '#version 300 es\nprecision highp float; uniform vec4 uC; out vec4 o; void main(){ o = uC; }';
  function prog(v, f){ var p = gl.createProgram(); [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]].forEach(function(x){ var s = gl.createShader(x[0]); gl.shaderSource(s, x[1]); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }); gl.linkProgram(p); return p; }
  var pr = prog(VS, FS), qp = prog(QV, QF), U = {}, uQC = gl.getUniformLocation(qp, 'uC');
  ['uT','uEase','uBez','uStagger','uTime','uAmp','uSize','uSizeVar','uJitter','uDpr','uOpacity','uGlow','uMagR','uMag','uStyle','uColorMode','uScale','uShift','uMouse','uC1','uC2','uShape','uSprite'].forEach(function(n){ U[n] = gl.getUniformLocation(pr, n); });
  var vao = gl.createVertexArray(), emptyVao = gl.createVertexArray(), buf = {}; gl.bindVertexArray(vao);
  [['A',0,2,gl.FLOAT,false],['B',1,2,gl.FLOAT,false],['CA',2,4,gl.UNSIGNED_BYTE,true],['CB',3,4,gl.UNSIGNED_BYTE,true],['K',4,1,gl.FLOAT,false],['R',5,4,gl.FLOAT,false],['O',6,2,gl.FLOAT,false]].forEach(function(a){
    buf[a[0]] = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf[a[0]]); gl.enableVertexAttribArray(a[1]); gl.vertexAttribPointer(a[1], a[2], a[3], a[4], 0, 0); });
  var spriteTex = gl.createTexture(), spriteOk = false, spriteSrc = null;
  function loadSprite(){ if (P.sprite === spriteSrc) return; spriteSrc = P.sprite; spriteOk = false; if (!P.sprite) return; var im = new Image(); im.onload = function(){ gl.bindTexture(gl.TEXTURE_2D, spriteTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); spriteOk = true; }; im.src = P.sprite; }

  /* ---------------- state */
  var items = [], N = 0, off = new Float32Array(0), vel = new Float32Array(0), curA = null, curB = null, curK = null, offDirty = false;
  var cur = 0, from = 0, to = 0, dir = 1, T = 1, phase = 'hold', clock = 0, time = 0, playing = true, scrubbing = false, scrollPos = 0, done = false;
  var mouse = { x:9, y:9, on:false, since:0 }, sc = [1,1], dead = false, visible = true, frames = 0, slow = 0, ready = false;
  var STYLES = { direct:0, explode:1, swirl:2, flow:3, gravity:4 }, SHAPES = { circle:0, square:1, diamond:2, star:3, ring:4, custom:5 }, CMODES = { original:0, single:1, gradient:2, blend:3 };
  function eff(k, i){ var o = items[i] && items[i].own; return o && o.on && o[k] !== undefined && o[k] !== '' ? o[k] : P[k]; }
  function bez(x1, y1, x2, y2, x){ var t = x, i; for (i = 0; i < 6; i++){ var cx = 3*x1*t*(1-t)*(1-t)+3*x2*t*t*(1-t)+t*t*t-x, dx = 3*x1*(1-t)*(1-3*t)+3*x2*t*(2-3*t)+3*t*t; if (Math.abs(dx) < 1e-5) break; t = clamp(t-cx/dx, 0, 1); } return 3*y1*t*(1-t)*(1-t)+3*y2*t*t*(1-t)+t*t*t; }
  var EASES = { linear:0, inout:1, elastic:2, back:3, bezier:4 };
  function bezNums(){ var b = String(P.bezier).split(',').map(parseFloat); return b.length === 4 && b.every(isFinite) ? [clamp(b[0],0,1), b[1], clamp(b[2],0,1), b[3]] : null; }
  function ease(t, kind){ t = clamp(t, 0, 1);
    if (kind === 'linear') return t; if (kind === 'elastic') return t === 0 || t === 1 ? t : Math.pow(2, -9*t)*Math.sin((t*8-.75)*TAU/3)+1;
    if (kind === 'back'){ var c = 1.9; return 1+(c+1)*Math.pow(t-1, 3)+c*Math.pow(t-1, 2); }
    if (kind === 'bezier'){ var b = bezNums(); if (b) return bez(b[0], b[1], b[2], b[3], t); }
    return t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2, 3)/2; }

  function resample(){ if (!items.length) return; N = 0; items.forEach(function(it){ it.samp = sample(it); it.arr = {}; if (it.samp.n > N) N = it.samp.n; });
    var R = rng(4242), rnd = new Float32Array(N*4), i; for (i = 0; i < N*4; i++) rnd[i] = R();
    off = new Float32Array(N*2); vel = new Float32Array(N*2);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.R); gl.bufferData(gl.ARRAY_BUFFER, rnd, gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, buf.O); gl.bufferData(gl.ARRAY_BUFFER, off, gl.DYNAMIC_DRAW);
    pair(from, to); ready = true; }
  function rearrange(){ items.forEach(function(it){ it.arr = {}; }); if (ready) pair(from, to); }
  function pair(a, b){ a = clamp(a, 0, items.length-1); b = clamp(b, 0, items.length-1); from = a; to = b;
    var mode = eff('mapping', a), A = arrange(items[a], mode), B = arrange(items[b], mode);
    [['A', A.pos], ['B', B.pos], ['CA', A.col], ['CB', B.col], ['K', B.dly]].forEach(function(x){ gl.bindBuffer(gl.ARRAY_BUFFER, buf[x[0]]); gl.bufferData(gl.ARRAY_BUFFER, x[1], gl.DYNAMIC_DRAW); });
    curA = A.pos; curB = B.pos; curK = B.dly; }
  function target(step){ var n = items.length, t = cur+step; if (P.playback === 'loop') return ((t%n)+n)%n; if (t < 0 || t >= n){ if (P.playback === 'pingpong'){ dir = -dir; return clamp(cur+dir, 0, n-1); } return -1; } return t; }
  function go(j){ if (!ready || items.length < 2 || phase === 'morph' || phase === 'delay' || j < 0 || j === cur) return false; pair(cur, j); T = 0; clock = 0; phase = eff('delay', cur) > 0 ? 'delay' : 'morph'; done = false; return true; }
  function next(){ var t = target(1); if (t < 0) t = (cur+1)%items.length; return go(t); }
  function prev(){ var t = cur-1 < 0 ? items.length-1 : cur-1; return go(t); }

  /* ---------------- pointer */
  function toUnits(e){ var r = canvas.getBoundingClientRect(), cx = (e.clientX-r.left)/r.width*2-1, cy = -((e.clientY-r.top)/r.height*2-1); return [(cx-P.posX)/sc[0], (cy-P.posY)/sc[1]]; }
  function pm(e){ var u = toUnits(e); mouse.x = u[0]; mouse.y = u[1]; if (!mouse.on){ mouse.on = true; mouse.since = 0; } }
  function pl(){ mouse.on = false; mouse.x = mouse.y = 9; }
  canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerdown', function(e){ pm(e); if (e.pointerType !== 'mouse'){ try { canvas.setPointerCapture(e.pointerId); } catch(x){} } });
  canvas.addEventListener('pointerleave', pl); canvas.addEventListener('pointercancel', pl); canvas.addEventListener('pointerup', function(e){ if (e.pointerType !== 'mouse') pl(); });
  canvas.addEventListener('click', function(){ if (P.trigger === 'click') next(); });
  canvas.addEventListener('wheel', function(e){ if (P.trigger !== 'scroll' || items.length < 2) return; e.preventDefault(); var n = items.length, max = P.playback === 'loop' ? n : n-1;
    scrollPos += e.deltaY*.0014; scrollPos = P.playback === 'loop' ? ((scrollPos%max)+max)%max : clamp(scrollPos, 0, max-.0001);
    var a = Math.floor(scrollPos), b = (a+1)%n; if (a !== from || b !== to) pair(a, b); cur = a; T = scrollPos-a; phase = 'scroll'; }, { passive:false });
  var io = window.IntersectionObserver ? new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }) : null; if (io) io.observe(canvas);

  /* ---------------- frame */
  function layout(){ var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(1, Math.round(canvas.clientWidth*dpr)), h = Math.max(1, Math.round(canvas.clientHeight*dpr));
    if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; } var a = w/h, k = 1-clamp(P.padding, 0, .9), wide = a >= 1;
    sc = P.fit === 'cover' ? (wide ? [k, k*a] : [k/a, k]) : (wide ? [k/a, k] : [k, k*a]); return canvas.height/Math.max(1, canvas.clientHeight); }
  function hover(dt){ if (!curA) return; var f = dt*60, st = P.stagger, rest = phase === 'hold', ek = eff('easing', from), on = P.hover && mouse.on, R = P.radius, R2 = R*R, S = P.strength*.012*f, k = P.spring*f, damp = Math.pow(clamp(P.damping, 0, .995), f), mode = P.hoverMode, any = false, mx = mouse.x, my = mouse.y;
    for (var i = 0, j = 0; i < N; i++, j += 2){ var ox = off[j], oy = off[j+1], vx = vel[j], vy = vel[j+1], near = false;
      if (on){ var p = rest ? 1 : clamp(ease(T*(1+st)-curK[i]*st, ek), 0, 1), dx = curA[j]+(curB[j]-curA[j])*p+ox-mx, dy = curA[j+1]+(curB[j+1]-curA[j+1])*p+oy-my, d2 = dx*dx+dy*dy;
        if (d2 < R2){ near = true; var d = Math.sqrt(d2)+1e-5, q = 1-d/R, nx = dx/d, ny = dy/d; q *= q;
          if (mode === 'attract'){ vx -= nx*q*S*.8; vy -= ny*q*S*.8; } else if (mode === 'swirl'){ vx += -ny*q*S; vy += nx*q*S; }
          else if (mode === 'scatter'){ vx += (Math.random()-.5)*q*S*3; vy += (Math.random()-.5)*q*S*3; } else if (mode === 'magnify'){ vx += nx*q*S*.35; vy += ny*q*S*.35; } else { vx += nx*q*S; vy += ny*q*S; } } }
      if (!near && ox === 0 && oy === 0 && vx === 0 && vy === 0) continue;
      vx = (vx-ox*k)*damp; vy = (vy-oy*k)*damp; ox += vx; oy += vy;
      if (!near && Math.abs(ox)+Math.abs(oy) < 2e-4 && Math.abs(vx)+Math.abs(vy) < 2e-5){ ox = oy = vx = vy = 0; }
      off[j] = ox; off[j+1] = oy; vel[j] = vx; vel[j+1] = vy; any = true; }
    if (any || offDirty){ gl.bindBuffer(gl.ARRAY_BUFFER, buf.O); gl.bufferSubData(gl.ARRAY_BUFFER, 0, off); offDirty = any; } }
  function tick(dt){ if (!ready || items.length < 2) return; if (mouse.on) mouse.since += dt;
    if (scrubbing || !playing || phase === 'scroll') return;
    if (phase === 'hold'){ clock += dt;
      if (P.trigger === 'auto' && !done && clock >= eff('hold', cur)){ var t = target(dir); if (t < 0) done = true; else go(t); }
      else if (P.trigger === 'hover' && mouse.on && mouse.since >= Math.max(.3, eff('hold', cur))){ mouse.since = 0; next(); } }
    else if (phase === 'delay'){ clock += dt; if (clock >= eff('delay', from)) phase = 'morph'; }
    else if (phase === 'morph'){ T += dt/Math.max(.05, eff('duration', from)); if (T >= 1){ T = 1; cur = to; phase = 'hold'; clock = 0; scrollPos = cur; } } }
  var last = 0;
  function frame(now){ if (dead) return; requestAnimationFrame(frame); var dt = Math.min(.05, (now-last)/1000 || 0); last = now;
    if (!visible || document.hidden || !ready) return;                                               /* nothing is drawn while the canvas is off-screen */
    var t0 = performance.now(), dpr = layout(); time += dt; tick(dt); hover(dt); loadSprite();
    gl.viewport(0, 0, canvas.width, canvas.height); gl.enable(gl.BLEND); var bg = hex(P.bg), trail = P.transparent ? 0 : clamp(P.trails, 0, .98);
    if (trail > 0){ gl.useProgram(qp); gl.bindVertexArray(emptyVao); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform4f(uQC, bg[0], bg[1], bg[2], 1-trail*.96); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    else { if (P.transparent) gl.clearColor(0, 0, 0, 0); else gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.useProgram(pr); gl.bindVertexArray(vao); if (P.glow > 0) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var ek2 = eff('easing', from), bz = ek2 === 'bezier' ? bezNums() : null, c1 = hex(P.color), c2 = hex(P.color2), shape = SHAPES[P.shape] || 0; if (shape === 5 && !spriteOk) shape = 0;
    gl.uniform1f(U.uT, phase === 'hold' ? 1 : T); gl.uniform1i(U.uEase, bz ? 4 : ek2 === 'bezier' ? 1 : EASES[ek2] === undefined ? 1 : EASES[ek2]); gl.uniform4f(U.uBez, bz ? bz[0] : 0, bz ? bz[1] : 0, bz ? bz[2] : 1, bz ? bz[3] : 1); gl.uniform1f(U.uStagger, P.stagger); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uAmp, eff('amp', from)); gl.uniform1f(U.uSize, P.size); gl.uniform1f(U.uSizeVar, P.sizeVar); gl.uniform1f(U.uJitter, P.jitter);
    gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uOpacity, P.opacity); gl.uniform1f(U.uGlow, P.glow); gl.uniform1f(U.uMagR, P.radius); gl.uniform1f(U.uMag, P.hover && P.hoverMode === 'magnify' && mouse.on ? P.strength*2.5 : 0);
    gl.uniform1i(U.uStyle, STYLES[eff('style', from)] || 0); gl.uniform1i(U.uColorMode, CMODES[P.colorMode] || 0); gl.uniform2f(U.uScale, sc[0], sc[1]); gl.uniform2f(U.uShift, P.posX, P.posY); gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform3f(U.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(U.uC2, c2[0], c2[1], c2[2]); gl.uniform1i(U.uShape, shape); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, spriteTex); gl.uniform1i(U.uSprite, 0);
    gl.drawArrays(gl.POINTS, 0, N);
    var ms = performance.now()-t0; frames++; if (frames > 40 && frames < 400 && (dt > .03 || ms > 14)) slow++;                      /* a weak device: thin the particles out, once or twice */
    if (P.autoQuality && frames === 240 && slow > 90 && P.count > 6000){ P.count = Math.round(P.count*.55); frames = 41; slow = 0; resample(); if (opts.onQuality) opts.onQuality(P.count); }
    if (opts.onState) opts.onState(api.state()); }

  function load(src){ return new Promise(function(res){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = function(){ res(null); }; im.src = src; }); }
  function setImages(list){ var keep = items; return Promise.all(list.map(function(x, i){ var old = keep.find(function(k){ return k.src === x.src; });
      return old ? Promise.resolve(Object.assign(old, { own:x.own || null })) : load(x.src).then(function(el){ return el ? { src:x.src, el:el, own:x.own || null, seed:1000+Math.round(Math.random()*1e6), arr:{} } : null; }); }))
    .then(function(arr){ items = arr.filter(Boolean); cur = clamp(cur, 0, Math.max(0, items.length-1)); from = to = cur; T = 1; phase = 'hold'; clock = 0; done = false; if (items.length) resample(); return api; }); }
  var RESAMPLE = { count:1, sampling:1, threshold:1, bgMode:1, invert:1, tone:1 }, REARR = { extras:1 };
  var api = { P:P,
    set: function(k, v){ P[k] = v; if (RESAMPLE[k]) resample(); else if (REARR[k]) rearrange(); else if (k === 'mapping' && phase === 'hold' && ready) pair(cur, cur); if (k === 'trigger'){ phase = 'hold'; T = 1; clock = 0; pair(cur, cur); } if (k === 'playback') done = false; },
    setAll: function(o){ Object.assign(P, o); if (items.length) resample(); done = false; },
    setImages: setImages, setOwn: function(i, o){ if (items[i]) items[i].own = o || null; }, next: next, prev: prev, goto: function(i){ return go(i); }, refreshSteps: function(){ if (phase === 'hold' && ready) pair(cur, cur); },
    play: function(v){ playing = v === undefined ? !playing : !!v; return playing; },
    seek: function(t){ if (items.length < 2) return; if (phase === 'hold'){ var j = target(dir); if (j < 0) j = (cur+1)%items.length; pair(cur, j); } scrubbing = true; phase = 'morph'; T = clamp(t, 0, 1); },
    release: function(){ scrubbing = false; if (T >= 1){ cur = to; phase = 'hold'; clock = 0; } else if (T <= 0){ phase = 'hold'; clock = 0; T = 1; pair(cur, cur); } },
    state: function(){ return { index:cur, from:from, to:to, t:phase === 'hold' ? 0 : T, phase:phase, playing:playing, images:items.length, particles:N }; },
    loopSeconds: function(){ var s = 0; items.forEach(function(_, i){ s += eff('hold', i)+eff('delay', i)+eff('duration', i); }); return s; },
    restart: function(){ cur = 0; dir = 1; from = to = 0; T = 1; phase = 'hold'; clock = 0; done = false; if (ready) pair(0, 0); },
    destroy: function(){ dead = true; if (io) io.disconnect(); } };
  var weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /Mobi|Android/i.test(navigator.userAgent);
  if (P.autoQuality && weak && P.count > 22000){ P.count = 22000; if (opts.onQuality) opts.onQuality(P.count); }
  requestAnimationFrame(frame);
  if (opts.images && opts.images.length) setImages(opts.images.map(function(s, i){ return typeof s === 'string' ? { src:s, own:(opts.overrides || [])[i] || null } : s; }));
  return api;
}
ParticleMorph.DEFAULTS = { count:42000, sampling:'stipple', tone:.9, threshold:.1, bgMode:'auto', invert:false,
  mapping:'nearest', style:'flow', amp:.55, extras:'fade', stagger:.35,
  trigger:'auto', duration:2.4, hold:1.8, delay:0, easing:'inout', bezier:'0.7,0,0.2,1', playback:'loop',
  hover:true, hoverMode:'repel', radius:.2, strength:.6, spring:.06, damping:.86,
  size:1.5, sizeVar:.45, shape:'circle', sprite:'', colorMode:'original', color:'#ffffff', color2:'#4f7cff', opacity:.9, glow:0, trails:0, jitter:.25, bg:'#08080a', transparent:false,
  canvasMode:'fill', cw:1080, ch:1080, fit:'contain', padding:.14, posX:0, posY:0, autoQuality:true };
window.ParticleMorph = ParticleMorph;
