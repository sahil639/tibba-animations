/* ══════════════════════════════════════════════════════════════════════════
   The case studies
   ─────────────────────────────────────────────────────────────────────────
   Four deep pages with the same spine, so they are one template and four data
   objects rather than four hand-built files. Each page is a shell that names
   its own id; everything below fills it in.

   ── on the artwork ────────────────────────────────────────────────────────
   These pages are carried on screenshots of the clients' own products — phone
   frames, dashboards, design-system plates. Those are the clients' assets and
   are not in this repo, so every one of them is a labelled `figure` here: the
   right shape, in the right place in the scroll, captioned with what belongs
   in it. The layout, the rhythm and the scroll are the finished thing; the
   images are the one part waiting on a hand-off.

   A block is one of:
     { k: 'text',   h, p[] }                 a heading and its paragraphs
     { k: 'points', h, p, items[] }          a heading, a lead-in, a list
     { k: 'figure', label, ratio, caption }  a plate where artwork goes
     { k: 'stats',  items: [{ n, l }] }      numbers, on the odometer
     { k: 'quote',  q, who, role }           a pull quote
   ═════════════════════════════════════════════════════════════════════════ */
window.TIBBA_CASES = {

  /* ───────────────────────────────────────────────────────── Groww ────── */
  groww: {
    id: 'groww', client: 'Groww', colour: '#4DD9C0', status: 'Work in progress',
    title: "How we helped India's largest stock broker with growwth",
    tags: ['Fintech', 'Mobile app', 'Website', 'Growth'],
    meta: [
      { k: 'Expertise', v: 'Growth design, UI design, research, product strategy, design system' },
      { k: 'Deliverables', v: 'Landing pages, stocks feed, financial calculators, Groww Stories and much more' },
      { k: 'Duration', v: '1 year' },
      { k: 'Year', v: '2024 – present' },
    ],
    hero: { label: 'Groww app screens', ratio: '16 / 9',
            caption: 'The feed, Stories and the calculators, side by side' },
    blocks: [
      { k: 'text', h: 'The brief', p: [
        "Groww is India's largest stockbroking platform and the go-to investing app for millions of Indians. It lets people invest in stocks, mutual funds, ETFs and more through a clean, intuitive experience — making what was once complex feel refreshingly simple. Backed by marquee global investors, it has grown into one of the country's most trusted fintech unicorns.",
        "The company is gearing up for its IPO, on a mission to make investing accessible, transparent and effortless for a generation ready to take control of their financial future.",
      ] },

      { k: 'text', h: 'Groww Feed', p: [
        'We built a dedicated financial news feed inside the Groww app to serve every user with timely, relevant market insight — enabling market research without leaving the app, and driving better-informed investment decisions.',
      ] },
      { k: 'figure', label: 'Groww Feed', ratio: '4 / 3',
        caption: 'The feed, with its publisher buckets along the top' },
      { k: 'text', h: 'Content structure and segmentation', p: [
        'Content was organised into distinct buckets, each acting as a publisher. That let users filter news by their own interests and investment style rather than wading through one undifferentiated stream.',
      ] },

      { k: 'text', h: 'Groww Stories', p: [
        "As millions of retail investors began entering India's stock market, Groww identified a clear need to make financial news accessible to them. That sparked Groww Stories — a feature that turns market events, company results, IPOs and more into clear, visually engaging narratives.",
        'Built for mobile and designed for speed, these bite-sized stories bridge the gap between financial markets and financial literacy while staying timely, accurate and easy to consume.',
      ] },
      { k: 'figure', label: 'Groww Stories', ratio: '16 / 10',
        caption: 'A story, frame by frame, and the short film of the work' },

      { k: 'text', h: 'XIRR calculator', p: [
        "The XIRR calculator is one of Groww's most used tools — but like many financial calculators, the version that existed risked overwhelming people with numbers. Our redesign focused on making the experience intuitive and reassuring.",
        'By improving the flow of information and the interface around it, we made XIRR easier to understand. The key addition was a dynamic wealth-projection visualisation, so a user can tie the number back to the growth of their own investment.',
      ] },
      { k: 'figure', label: 'XIRR calculator', ratio: '16 / 10',
        caption: 'The calculator, and the projection that explains the number' },
    ],
  },

  /* ─────────────────────────────────────────────────────── Firstpost ──── */
  firstpost: {
    id: 'firstpost', client: 'Firstpost', colour: '#E05555',
    eyebrow: 'News, but make it video first.',
    title: 'How we helped Firstpost pivot their content and business strategy',
    tags: ['News & media', 'Website', 'Mobile app', 'Design system'],
    meta: [
      { k: 'Expertise', v: 'Research, product strategy, design system' },
      { k: 'Deliverables', v: 'Website, and phase 1 of the mobile application' },
      { k: 'Duration', v: '7 months' },
      { k: 'Live at', v: 'firstpost.com' },
    ],
    hero: { label: 'Firstpost 2.0', ratio: '16 / 9',
            caption: 'The video-first home page, on desktop and mobile web' },
    blocks: [
      { k: 'stats', h: 'The outcome', items: [
        { n: '2x',  l: 'Website traffic' },
        { n: '30%', l: 'Increase in average session duration' },
        { n: '40%', l: 'Reduction in page load time across the site' },
        { n: '2x',  l: 'Increase in revenue' },
      ] },

      { k: 'points', h: 'The brief',
        p: 'Firstpost is a news company under the Network18 group. We helped them with a design overhaul of their website and the creation of their first mobile app, alongside a significant pivot in business and content strategy.',
        items: [
          'Redesign as a video-first platform',
          "Position as India's leader in geo-political coverage",
          'Facilitate a product-led pivot of business and content strategy',
          'Elevate the Firstpost brand to “India’s take on the world”',
        ] },

      { k: 'text', h: 'Understanding the landscape', p: [
        'Given how different the vision was from the existing product, understanding both the industry incumbents and user behaviour formed important cornerstones of our design process.',
        'We explored several video-first platforms alongside a selection of news competitors, to understand how the industry serves video and to benchmark the experience we were about to build. One trend was evident across all of them: dark backgrounds, so that the viewer’s attention stays on the video itself.',
      ] },
      { k: 'figure', label: 'Competitive teardown', ratio: '16 / 9',
        caption: 'Video-first platforms and news incumbents, side by side' },

      { k: 'points', h: 'How do people consume information in 2023?',
        p: 'We ran user interviews to get at consumption patterns, behaviours and motivations — then bucketed users into three types by frequency, preferred source, what they get out of staying informed, and where it sits in their day.',
        items: [
          '“I read the news every day, it makes me feel aware of and connected to the entire world”',
          '“I prefer short-form content since my attention span has reduced”',
          '“Videos are easier to consume — reading articles takes a lot of time”',
          '“I like to stay up to date with the latest trending topics”',
        ] },

      { k: 'text', h: 'A video-first platform', p: [
        'From the outset we were designing a video-first news website. Every design decision revolved around the video — from the dark theme to the hover experience — so that the design carried the content-strategy pivot rather than sitting beside it.',
        'The challenge was to meet the expectations set by other players and then take a step past them. After designing a base experience we ran design workshops with the product team to explore directions it could take, which produced an experience unique to Firstpost — and opened up avenues of monetisation for the business along the way.',
      ] },
      { k: 'figure', label: 'The video experience', ratio: '16 / 9',
        caption: 'The player, its related-reading rail and the AI assistant' },

      { k: 'text', h: 'A mobile-first approach', p: [
        "85% of Firstpost's users reach the site on their phone and only 15% on desktop — a split concurrent with our times — so the mobile web experience became the centre of the work rather than an adaptation of it.",
      ] },

      { k: 'points', h: 'Designing for business',
        p: 'Advertising on the site was a primary channel of monetisation, so the interface was designed around those objectives from the start rather than having inventory cut into it afterwards. We designed for sponsored content on the platform too.',
        items: ['MREC and leaderboard', 'Gutter ads', 'ATF ads',
                'Section on the home page', 'First-fold unit', 'Dedicated page'] },

      { k: 'text', h: 'A scalable design system across platforms', p: [
        'Built today, for the future. The design system was built around Firstpost being a video-first platform and structured to serve mobile web, desktop and the mobile app at once — from type and colour styles all the way to the video player components, and scoped against the product roadmap for the coming year.',
      ] },
      { k: 'figure', label: 'The design system', ratio: '16 / 10',
        caption: 'Type scale in Literata and Inter, colour, and the player components' },
    ],
  },

  /* ─────────────────────────────────────────────────────── Breathe ────── */
  'breathe-esg': {
    id: 'breathe-esg', client: 'Breathe ESG', colour: '#4CAF70',
    title: 'How we helped Breathe ESG redesign by leveraging design sprints',
    tags: ['SaaS', 'ESG', 'Dashboard', 'Design sprints'],
    meta: [
      { k: 'Expertise', v: 'UI design, design system, design sprints' },
      { k: 'Deliverables', v: 'Design system and platform redesign' },
      { k: 'Duration', v: '8 weeks' },
      { k: 'Year', v: '2023' },
    ],
    hero: { label: 'Breathe ESG platform', ratio: '16 / 9',
            caption: 'The redesigned dashboard and its reporting views' },
    blocks: [
      { k: 'text', h: 'The brief', p: [
        'Breathe ESG — environment, social, governance — is an enterprise SaaS for end-to-end sustainability management. Its platform is where technology meets sustainability, turning raw data into actionable insight for its customers.',
        'They aim to simplify the complexities of ESG, making sustainability both accessible and actionable for everyone in an organisation.',
      ] },

      /* The challenge, as the Matcha Cartel Origin Log cards (case-sections.js):
         the title sits on top, the five cards spring in below it. */
      { k: 'origin', kicker: 'The challenge', h: 'Redesign the platform in 8 weeks', p: [
        'They had an existing platform, but it felt old and outdated, and that translated into declining confidence from their clients. It was functional without being optimised for the people actually using it.',
        'That is where we stepped in, taking on the challenge of redesigning the platform inside eight weeks by leveraging design sprints.',
      ], cards: [
        { id: '01', era: 'Where it stood', title: 'An ageing\nplatform', subtitle: 'The existing product',
          body: ['Functional, but old and outdated.', 'Built around the data, not around the people using it.'],
          fig: 'FIG. 01', figLabel: 'Legacy\ndashboard', landscape: true,
          w: 650, h: 475, bg: '#4CAF70', ink: '#0B1A11', fill: '#1E3A2A', z: 5 },
        { id: '02', era: 'The signal', title: 'Confidence\nslipping', subtitle: 'What clients felt',
          body: ['An outdated platform read as an outdated company.', 'Client confidence had started to decline.'],
          fig: 'FIG. 02', figLabel: 'Client\nfeedback',
          w: 445, h: 600, bg: '#1E3A2A', ink: '#E8E3DC', fill: '#8FD19E', z: 3 },
        { id: '03', era: 'The constraint', title: 'Eight\nweeks', subtitle: 'The window we had',
          body: ['A full redesign, start to handoff, in eight weeks.', 'No room for a long discovery phase.'],
          fig: 'FIG. 03', figLabel: 'Project\ntimeline',
          w: 488, h: 528, bg: '#E8E3DC', ink: '#111111', fill: '#4CAF70', z: 2 },
        { id: '04', era: 'The method', title: 'Design\nsprints', subtitle: 'How we fit it in',
          body: ['Five sprints, each with a fixed structure.', 'Solutions validated with Breathe ESG as we went.'],
          fig: 'FIG. 04', figLabel: 'Sprint\ncadence', landscape: true,
          w: 775, h: 425, bg: '#8796A1', ink: '#0D0D0D', fill: '#E8E3DC', z: 1 },
        { id: '05', era: 'The foundation', title: 'One\nsystem', subtitle: 'What made it possible',
          body: ['Components set up on day one.', 'Every sprint built on the one before it.'],
          fig: 'FIG. 05', figLabel: 'Design\nsystem',
          w: 475, h: 650, bg: '#A9D8B8', ink: '#0B1A11', fill: '#2F7D4C', z: 5 },
      ] },

      { k: 'stats', h: 'The market they are in', items: [
        { n: '50%',      l: 'ESG disclosure among the top listed companies in India, FY 2022–23' },
        { n: '1000',     l: 'Top listed companies SEBI requires to report their ESG metrics' },
        { n: '$2098.9M', l: 'Projected size of the ESG reporting software market by 2030' },
      ] },

      { k: 'quote', q: 'Sustainability is the hottest topic in every large corporation today.',
        who: 'Karantaj Singh & Shaayak Chaterjee', role: 'Founders, Breathe ESG' },

      { k: 'globe', h: 'Getting started', p: [
        'To get at the heart of what made the existing platform hard to use, we started by understanding how ESG reporting works as a whole. That told us the real complexity of each feature and informed how we broke the sprints up.',
        'It also let us understand the reporting requirements of different industries, and how differently the various user types in a single organisation actually use the system.',
      ], legend: [
        'Reporting requirements differ by industry',
        'Every user type sees the system differently',
        'Many organisations, one platform',
      ], caption: 'Organisations reporting into one platform' },

      /* The five sprints, as the Matcha Cartel Hyperfixation reader
         (case-sections.js). Colour blocks stand in for the sprint work; the
         palette is the site's own — the four client colours and the accent. */
      { k: 'hyper', seed: 11, pin: 7,
        kicker: 'Structuring our design sprints',
        title: 'Five design\nsprints.',
        note: 'Colour blocks stand in for the sprint work.\nEight weeks, five sprints.',
        palette: ['#4CAF70', '#E85D3D', '#7B8FF5', '#4DD9C0', '#E0B25A', '#C46BAE', '#5E6B78', '#E05555'],
        archive: { h: 'Sprint\nlog.',
          p: 'To leverage sprints properly we settled a fixed structure for each one. That gave us quick turnarounds, got solutions validated by the stakeholders at Breathe ESG as we went, and left enough time to iterate and prepare for handoff.' },
        items: [
          { line: 'Weeks 01 — 02', title: 'Visual design, onboarding & data entry',
            meta: [['Sprint', '01 of 05'], ['Duration', '2 weeks'], ['Focus', 'The front door']],
            p: 'The first sprint set the visual language and the two places every user starts: onboarding, and entering their ESG data. Getting these right first gave every later sprint a settled look and a working front door to build on.' },
          { line: 'Week 03', title: 'Materiality, supplier assessment & settings',
            meta: [['Sprint', '02 of 05'], ['Duration', '1 week'], ['Focus', 'What matters, and to whom']],
            p: 'Materiality decides which ESG topics matter to an organisation; supplier assessment carries the same questions down its supply chain. One week, because both could reuse the patterns the first sprint had just settled.' },
          { line: 'Weeks 04 — 05', title: 'Targeting, reporting & template creation',
            meta: [['Sprint', '03 of 05'], ['Duration', '2 weeks'], ['Focus', 'The reports themselves']],
            p: 'Where the platform earns its keep: setting targets, producing reports, and letting teams build their own templates. The densest sprint of the five, and the one the stakeholders tested hardest.' },
          { line: 'Weeks 06 — 07', title: 'Analytics & dashboard',
            meta: [['Sprint', '04 of 05'], ['Duration', '2 weeks'], ['Focus', 'Insight for leadership']],
            p: 'Turning raw data into insight for upper management — KPIs, tables and visualisations that answer a question rather than decorate one.' },
          { line: 'Week 08', title: 'Visual enhancements',
            meta: [['Sprint', '05 of 05'], ['Duration', '1 week'], ['Focus', 'Polish and handoff']],
            p: 'A final pass across everything built so far: consistency, polish, and the edge cases that only show up once the whole platform is in one place — then handoff.' },
        ] },


      { k: 'text', h: 'Designing for data density', p: [
        'The platform turns raw data into actionable insight for upper management. That meant making dense data consumable — as tables, as KPIs, and as data visualisations that answer a question rather than decorate one.',
      ] },
      { k: 'figure', label: 'Supplier assessment', ratio: '16 / 9',
        caption: 'Assessment tables, filters and the KPI header' },

      /* The same reader again, for the design system. Its colour blocks are
         drawn from Breathe ESG's own greens rather than the site palette. */
      { k: 'hyper', seed: 29, pin: 7,
        kicker: 'A design system from day one',
        title: 'Design system\nfrom day 1.',
        note: 'Colour blocks stand in for the system.\nSet up before the first screen.',
        palette: ['#4CAF70', '#2F7D4C', '#8FD19E', '#1E4A31', '#A9C8B3', '#6E8B74', '#3E5C48', '#CFE3D5'],
        archive: { h: 'System\nlayers.',
          p: 'Setting the components up at the very onset of the project let us iterate faster as we went. It paid off over the engagement: turnarounds accelerated, and the system had time to evolve and grow rather than being retro-fitted at the end.' },
        items: [
          { line: 'Layer 01 · Foundations', title: 'Colour, type & spacing',
            meta: [['Set up', 'Sprint 01'], ['Used by', 'Every screen']],
            p: 'The tokens everything else is built from, fixed before the first screen was drawn — so a change to one travels everywhere instead of being made by hand a hundred times.' },
          { line: 'Layer 02 · Components', title: 'Inputs, tables & controls',
            meta: [['Set up', 'Sprint 01'], ['Used by', 'Entry, assessment, reporting']],
            p: 'The pieces the platform is made of. Data entry, assessment and reporting all draw on one set, which is what let the later sprints move at a week each.' },
          { line: 'Layer 03 · Data', title: 'KPIs, charts & dense tables',
            meta: [['Set up', 'Sprints 03 — 04'], ['Used by', 'Dashboards, reports']],
            p: 'Patterns for making dense data consumable: how a KPI sits above its table, and how a chart answers the question the table raises.' },
          { line: 'Layer 04 · Guidance', title: 'Tooltips, toasts & filters',
            meta: [['Set up', 'Throughout'], ['Used by', 'Everyone, at the point of need']],
            p: 'Help at the point of confusion rather than in a manual — the platform\u2019s terminology explained exactly where it is used.' },
          { line: 'Layer 05 · Roles', title: 'Views by permission',
            meta: [['Set up', 'Sprint 04'], ['Used by', 'Entry, approval, leadership']],
            p: 'The same system seen three ways: the person entering data, the one approving it, and the one reading the result.' },
        ] },
      { k: 'figure', label: 'Wireframe to high fidelity', ratio: '16 / 9',
        caption: 'The drag-to-compare: wireframe on the left, mockup on the right' },

      { k: 'text', h: 'Contextual hand-holding', p: [
        'The platform carries its own share of complexity, from domain-specific terminology to system-specific responses. To make it easier to comprehend we introduced tooltips, toasts and straightforward filters on the tables — help at the point of confusion rather than in a manual.',
      ] },

      { k: 'text', h: 'A single method for data entry', p: [
        'We introduced one streamlined input method tailored to accommodate diverse user needs. The simplification improved the experience and extended to the technical implementation, which made it a smoother build.',
      ] },

      { k: 'text', h: 'Designing for different users by role', p: [
        'Most organisations have predefined levels of hierarchy, and an ESG platform has to respect them: who may enter data, who may approve it, and who reads the result are three different people with three different views of the same system.',
      ] },
    ],
  },

  /* ──────────────────────────────────────────── Shyft & Mindhouse ─────── */
  'shyft-and-mindhouse': {
    id: 'shyft-and-mindhouse', client: 'Shyft & Mindhouse', colour: '#7B8FF5',
    title: 'How we helped two sister brands as a support design team',
    tags: ['Fitness', 'Mental health', 'Mobile app', 'Design system'],
    meta: [
      { k: 'Expertise', v: 'UI design, design system, research' },
      { k: 'Deliverables', v: 'Design system, landing pages, app redesign' },
      { k: 'Duration', v: '8 months' },
      { k: 'Year', v: '2023' },
    ],
    hero: { label: 'Shyft and Mindhouse', ratio: '16 / 9',
            caption: 'Both apps, and the landing pages built for them' },
    blocks: [
      { k: 'text', h: 'The brief', p: [
        'We worked with two sister brands, Shyft and Mindhouse, over eight months as a support design team, across a variety of projects.',
        'Shyft combines lifestyle-management solutions — nutrition, yoga, exercise and more — to help customers track, reverse and manage chronic health conditions. Mindhouse is a mental health and wellness platform offering meditation, therapy and community-based support.',
      ] },

      { k: 'text', h: 'Shyft design system — built for speed and scale', p: [
        "We audited the existing components in Shyft's mobile app design system thoroughly, and found significant redundancy. Streamlining it cut the design debt and let the team move faster: twelve instances of the bottom-sheet component, for one, collapsed into a single component with variants.",
      ] },
      { k: 'figure', label: 'The bottom sheet, before and after', ratio: '16 / 10',
        caption: 'Twelve components, and the one set of variants that replaced them' },

      { k: 'points', h: 'Designing for conversion',
        p: 'Shyft ran ads for their bootcamps, and we helped supercharge the conversions. We designed a dynamic landing page template that cut their deployment time and let visitors find what resonated with them.',
        items: ['Highlight stats', 'Callbacks', 'Contextual and sticky CTAs',
                'USPs', 'Cross-selling'] },
      { k: 'stats', items: [
        { n: '70%', l: 'Decrease in sales team intervention' },
        { n: '15x', l: 'Increase in direct purchases via the landing page' },
      ] },

      { k: 'points', h: 'Designing for Shyft Pass',
        p: "We elevated the Shyft Pass landing page — raising the brand's appeal and adding micro-interactions that draw visitors in. Shyft Pass is the membership: weekend workouts, a supportive community, and the latest wellness products.",
        items: [
          'Revamp the UI to elevate the brand into a more modern, active-lifestyle space',
          'Improve the pricing strategy, surfacing plans in a structure that is easy to understand and transact with',
          'Rework the content with the sales team, so storytelling drives the conversion',
        ] },

      { k: 'text', h: 'Redesigning the onboarding', p: [
        'The Mindhouse app expanded rapidly, growing denser with each new vertical. The redesigned onboarding introduced users to the new features and gathered the details needed to make their experience better, rather than asking for everything up front.',
      ] },

      { k: 'text', h: 'Designing the therapy flow', p: [
        'Mindhouse operates in the mental health space, giving users recorded mindfulness content and access to mental health communities. Recognising the need to enrich that offering, they introduced Therapy — which expanded the service, and brought with it the need for a seamless therapy experience.',
      ] },

      { k: 'points', h: 'Challenges in the therapy landscape',
        p: 'Three things stood between someone who needed therapy and someone who was in it, and each one needed a different answer.',
        items: [
          'Lack of awareness and the stigma attached to therapy — despite the recent surge in mental health awareness, we saw real reluctance to seek professional help',
          'Cost — the perception that therapy carries a hefty price tag deters many people at exactly the moment they need it',
          'Finding the right therapist, and the fatigue that comes with it — people often cycle through several before finding a fit, and abandon the path to recovery on the way',
        ] },

      { k: 'points', h: 'Designing to overcome them',
        p: 'The flow answers each challenge directly rather than presenting a directory and hoping.',
        items: ['Education about what therapy actually is',
                'Help finding the right therapist',
                'Affordable trials, so cost is not the first hurdle'] },
      { k: 'figure', label: 'The therapy flow', ratio: '16 / 10',
        caption: 'Education, matching and booking, end to end' },

      { k: 'text', h: 'Post-launch optimisation', p: [
        'Once the therapy flow had spent time in the market we began optimising it for conversion — reading usage data against our initial research, then making iterative changes against the key metrics. One of the outcomes was a better distribution of leads across the therapists themselves.',
      ] },
    ],
  },
};

/* the order they appear in, for the "other projects" rail at the foot of each */
window.TIBBA_CASE_ORDER = ['groww', 'firstpost', 'breathe-esg', 'shyft-and-mindhouse'];
