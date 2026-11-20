"""The light footer's campfire, moving (Nov 2026).

Reads the drawing assets/icons/campfire-light.svg (crisp 8px squares on a
10px grid: the logs in #1b1d22, the flame in #e65733 with an #dd8c42 core)
and writes assets/icons/campfire-light-anim.svg: the logs as they are, and
the flame as eight frames shown in turn by a CSS step animation inside the
SVG, so it moves wherever the picture is used as an <img>. In each frame the
flame sways sideways by whole squares (more toward the tip), some of its
outer squares flicker, and a few embers rise off the top. Reduced motion:
the drawing as it was (frame 0 is the original).

    python3 tools/make-campfire-light-anim.py
"""
import math, random, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/icons/campfire-light.svg'
OUT = ROOT / 'assets/icons/campfire-light-anim.svg'
N, FRAME_S = 8, 0.13            # frames, seconds each
LOGS, RED, CORE = '#1b1d22', '#e65733', '#dd8c42'

svg = SRC.read_text()
groups = dict((c, [tuple(map(int, r)) for r in re.findall(r'<rect x="(\d+)" y="(\d+)" width="\d+" height="\d+"/>', body)])
              for c, body in re.findall(r'<g fill="([^"]+)">(.*?)</g>', svg, re.S))
logs, red, core = groups[LOGS], groups[RED], groups[CORE]
base_y = max(y for _, y in red)              # the flame's foot
top_y = min(y for _, y in red)
core_set = set(core)


def path(cells):
    return ''.join(f'M{x} {y}h8v8h-8z' for x, y in sorted(set(cells)))


def sway(y, t):
    """whole squares to the side, for row y in frame t: none at the foot, up to two at the tip"""
    h = (base_y - y) / max(1, base_y - top_y)          # 0 at the foot, 1 at the tip
    a = 2.2 * h ** 1.4
    return round(a * math.sin(2 * math.pi * t / N + h * 2.6)) * 10


filled = set(red) | core_set
def edge(x, y):
    return sum((x + dx, y + dy) in filled for dx, dy in ((10, 0), (-10, 0), (0, 10), (0, -10))) < 4


rng = random.Random(7)
frames = []
for t in range(N):
    if t == 0:
        frames.append((red, core, []))
        continue
    r_cells, c_cells = [], []
    for x, y in red:
        h = (base_y - y) / max(1, base_y - top_y)
        # the outer, sparser squares flicker (those with an empty side); the higher, the more
        if edge(x, y) and rng.random() < 0.12 + 0.25 * h:
            continue
        r_cells.append((x + sway(y, t), y))
    for x, y in core:
        c_cells.append((x + sway(y, t), y))
    # embers: a few squares rising beside the upper flame, two rows higher each frame
    embers = []
    for k, ex in enumerate((200, 330, 250)):
        ey = 200 - 20 * ((t + k * 3) % 8)
        embers.append((ex + 10 * round(math.sin(t * 0.9 + k * 2.1)), ey))
    frames.append((r_cells, c_cells, embers))

dur = N * FRAME_S
css = [f'.f{{visibility:hidden;animation:fl {dur:.2f}s steps(1,end) infinite}}',
       f'@keyframes fl{{0%{{visibility:visible}}{100 / N:.3f}%{{visibility:hidden}}100%{{visibility:hidden}}}}']
css += [f'.f{i}{{animation-delay:{-(N - i) * FRAME_S:.2f}s}}' for i in range(N)]
css += ['@media (prefers-reduced-motion:reduce){.f{animation:none}.f0{visibility:visible}}']

parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 588 728" width="588" height="728" shape-rendering="crispEdges">',
         f'<style>{"".join(css)}</style>',
         f'<path fill="{LOGS}" d="{path(logs)}"/>']
for i, (r_cells, c_cells, embers) in enumerate(frames):
    parts.append(f'<g class="f f{i}"><path fill="{RED}" d="{path(r_cells + embers)}"/><path fill="{CORE}" d="{path(c_cells)}"/></g>')
parts.append('</svg>')
OUT.write_text(''.join(parts))
print(OUT, OUT.stat().st_size, 'bytes,', N, 'frames,', f'{dur:.2f}s loop')
