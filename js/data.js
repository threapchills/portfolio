/* ============================================================
   PROJECT DATA – single source of truth
   Edit here to update project info across the whole site.
   ============================================================ */

const PROJECTS = [
  {
    id: "kalimba",
    index: "01",
    title: "Kalimba",
    category: "GenAI Filmmaking",
    type: "BTG GenAI Film Competition",
    skills: ["AI Prompting", "Visual Storytelling", "Writing", "Graphic Design"],
    tagline: "An Afrofuturist mockumentary shortlisted from 400+ entries.",
    description: `Proud to share that KALIMBA, a GenAI film I made, was shortlisted amongst 400+ entries in the BrandTech Group GenAI film competition and awarded $1,000.

KALIMBA is an Afrofuturist mockumentary in which the ordinary collides with the mythic: a South African innovator discovers a way to measure and record consciousness. The story is told through a surreal chromatic journey, juxtaposing the biblical and the digital, where AI-generated environments morph as fluidly as the soul of the film's protagonist.

I tried to craft something symbolic and layered: a philosophical allegory that leans into what generative filmmaking can actually do when you use it for quiet, intentional storytelling rather than loud chaotic spectacle.`,
    heroVideo: "../../video/kalimba-hero.mp4",
    heroFallback: "../../images/kalimba/thumb.webp",
    gallery: [
      "../../images/kalimba/parliamentcloseupo.webp",
      "../../images/kalimba/grankalib2.webp",
      "../../images/kalimba/banddesert.webp",
      "../../images/kalimba/Portrait_of_a_2k_202601290216.webp",
      "../../images/kalimba/Ancient_buddhist_temple_2k_202601300246.webp"
    ],
    links: [
      { label: "Watch the film", url: "https://www.youtube.com/watch?v=qQjJgnHjRlI", primary: true }
    ]
  },
  {
    id: "ramses",
    index: "02",
    title: "Ramses",
    category: "GenAI Filmmaking",
    type: "Runway 2026 Film Competition",
    skills: ["AI Prompting", "Visual Storytelling", "Writing", "Film Editing"],
    tagline: "A mythic Egyptian animated epic; my entry to the Runway 2026 film competition.",
    description: `This was my entry to the Runway 2026 film competition. I didn't win, but I'm glad I made this, because now it exists!`,
    heroVideo: "../../video/ramses-hero.mp4",
    heroFallback: "../../images/ramses/07-lion-money-shot.webp",
    gallery: [
      "../../images/ramses/01-nile-boat.webp",
      "../../images/ramses/02-family-dock.webp",
      "../../images/ramses/03-sphinx.webp",
      "../../images/ramses/04-seer.webp",
      "../../images/ramses/05-horus.webp",
      "../../images/ramses/06-coronation.webp",
      "../../images/ramses/07-lion-money-shot.webp",
      "../../images/ramses/08-khopesh.webp",
      "../../images/ramses/09-sunset.webp"
    ],
    links: [
      { label: "Watch the film", url: "https://drive.google.com/file/d/1lANyxkWP2oqHhilP28eTMtdJaVXpD-jx/view?usp=sharing", primary: true }
    ]
  },
  {
    id: "writing",
    index: "03",
    title: "Writing",
    category: "Writing",
    type: "Client + Personal",
    skills: ["Content Writing", "Copywriting", "Research", "Thought Leadership"],
    tagline: "Technology, AI, and Africa: reported and argued from Cape Town.",
    description: `We're living through an era where reality is moving faster than fiction. These writings – both personal and client – attempt to track these world-bending shifts in real-time.`,
    heroImage: "../../images/writing-hero.webp",
    stories: [
      { title: "The AI detector dilemma", url: "https://gadget.co.za/aidetector36t/", excerpt: "Using an AI detector to catch a modern LLM is like sending a 1990s-era MS Office Paperclip Helper to fight a T1000 from the Terminator movies." },
      { title: "Why you can't trust Grok 4's benchmarks", url: "https://mikewhyle.com/trust-issues-with-grok-4/", excerpt: "For users in South Africa and across the continent, the stakes are particularly high. Trust is the most critical currency." },
      { title: "Risen from the sea", url: "https://mikewhyle.com/risen-from-the-sea/", excerpt: "Imagine gazing out at a sunset that cascades over the ocean, viewed from the summit of a majestic flat-topped peak that has stood as witness to the passage of time for hundreds of millions of years." },
      { title: "What in the SMR is this?!", url: "https://mikewhyle.com/what-in-the-smr-is-this/", excerpt: "Generative AI and the digital economy are advancing at breakneck pace, but looming energy shortfalls could thwart Big Tech's best-laid plans for expansion." },
      { title: "The future of insurance in Africa", url: "https://mikewhyle.com/the-future-of-insurance-in-africa//", excerpt: "To adapt to the current circumstances and secure the longevity of their businesses, insurers must move beyond being resilient to being disruptive." },
      { title: "What's causing the skyrocketing demand for compute?", url: "https://mikewhyle.com/whats-causing-the-skyrocketing-demand-for-compute/", excerpt: "Data centers have evolved from repositories of information to become the operational bedrock of modern businesses." },
      { title: "Pioneering progress", url: "https://mikewhyle.com/pioneering-progress/", excerpt: "Experts are concerned about resource limits and insufficient radiology skills and services in Africa, particularly for cancer detection and treatment." },
      { title: "Blood, books and bots: the true origins of AI", url: "https://mikewhyle.com/blood-books-and-bots-the-true-origins-of-ai/", excerpt: "The first known use of AI is actually much earlier than people think. In fact it was during the Palaeolithic era, probably around 100,000 years ago." }
    ],
    links: []
  },
  {
    id: "mythopoeic",
    index: "04",
    title: "Mythopoeic",
    category: "Graphic Design",
    type: "Spec Ad",
    skills: ["Graphic Design", "AI Prompting", "Brand Building", "Visual Storytelling"],
    tagline: "A speculative jewellery brand demonstrating the power of AI for advertising and visual identity.",
    description: `A fake jewellery brand built entirely with AI tools, commissioned to showcase what AI-powered advertising, branding, and visual storytelling can achieve at the highest end of the market. The result: a fully realised luxury identity; editorial imagery, product visualisation, campaign assets indistinguishable from what a full crew and major production budget would deliver.`,
    heroVideo: "../../video/mythopoeic-hero.mp4",
    heroFallback: "../../images/mythopoeic/hero1.webp",
    gallery: [
      "../../images/mythopoeic/hero1.webp",
      "../../images/mythopoeic/hero2.webp",
      "../../images/mythopoeic/hero3.webp",
      "../../images/mythopoeic/hero4.webp",
      "../../images/mythopoeic/hero5.webp",
      "../../images/mythopoeic/hero6.webp",
      "../../images/mythopoeic/bracelet-model.webp",
      "../../images/mythopoeic/bracelet-showcase.webp",
      "../../images/mythopoeic/necklace-showcase-1.webp",
      "../../images/mythopoeic/necklace-showcase--on-model.webp",
      "../../images/mythopoeic/necklace-showcase-bust-display.webp",
      "../../images/mythopoeic/necklace-still-ref.webp",
      "../../images/mythopoeic/product-erf---rings.webp",
      "../../images/mythopoeic/product-showcase-all-2.webp",
      "../../images/mythopoeic/horses2.webp",
      "../../images/mythopoeic/gangster.webp",
      "../../images/mythopoeic/rhino.webp",
      "../../images/mythopoeic/seabed.webp"
    ],
    links: [
      { label: "Watch the film", url: "https://vimeo.com/1182972379", primary: true }
    ]
  },
  {
    id: "healthtech",
    index: "05",
    title: "EduTalkz · TravelMedz · TwinTech",
    category: "Graphic Design",
    type: "Client",
    skills: ["Brand Building", "Graphic Design", "Visual Storytelling", "Copywriting"],
    tagline: "Brand identity and visual systems for three healthtech startups.",
    description: `Recent design work across three healthtech clients at various stages of growth. Each brand required a distinct visual language: accessible edtech, clinical travel medicine, speculative digital twin technology. The unifying thread is rapid ideation and results with AI, for unprecedented quality and speed at a fraction of traditional costs. The key to making it work is a design sensibility that makes complex ideas feel approachable without dumbing them down.`,
    heroImage: "../../images/healthtech-design0B.webp",
    gallery: [
      "../../images/healthtech-design0C.webp",
      "../../images/healthtech-design2.webp",
      "../../images/healthtech-design3.webp",
      "../../images/healthtech-design7.webp",
      "../../images/healthtech-design9.webp",
      "../../images/healthtech-design6.webp",
      "../../images/healthtech-design10.webp",
      "../../images/healthtech-design13.webp"
    ],
    links: []
  },
  {
    id: "ice-tea",
    index: "06",
    title: "Ice Tea",
    category: "GenAI Filmmaking",
    type: "Personal / Creative Concept",
    skills: ["AI Prompting", "Visual Storytelling", "Film Editing"],
    tagline: "A short visual study. Afrofuturism on film.",
    description: `I've become low key obsessed with this like magical realism meets gritty Afrofuturist crime drama in a faux music video format vibe 😛 The kind of look brands used to need full production crews for. More incoming! 🙌`,
    heroVideo: "../../video/ice-tea-hero.mp4",
    heroFallback: "../../images/ice-tea/frame_02.webp",
    gallery: [
      "../../images/ice-tea/frame_02.webp",
      "../../images/ice-tea/frame_07.webp",
      "../../images/ice-tea/frame_12.webp",
      "../../images/ice-tea/frame_17.webp",
      "../../images/ice-tea/frame_22.webp",
      "../../images/ice-tea/frame_27.webp",
      "../../images/ice-tea/frame_32.webp",
      "../../images/ice-tea/frame_37.webp",
      "../../images/ice-tea/frame_42.webp",
      "../../images/ice-tea/frame_47.webp",
      "../../images/ice-tea/frame_52.webp",
      "../../images/ice-tea/frame_57.webp"
    ],
    links: [
      { label: "Watch the film", url: "https://www.youtube.com/watch?v=qkdM4NyXUjY", primary: true }
    ]
  },
  {
    id: "tale-of-twins",
    index: "07",
    title: `Tale of Twins<span class="title-zh">雙貓双雄</span>`,
    category: "GenAI Filmmaking",
    type: "Personal / For Fun",
    skills: ["AI Prompting", "Visual Storytelling", "Film Editing"],
    tagline: "A viral-leaning homage to 70s wuxia cinema, starring two cats.",
    description: `Tale of Twins is a tongue-in-cheek homage to 70s kung-fu wuxia cinema, reimagined as a duel between two cats; one an ascetic white-robed monk, the other crowned in black armour. Made purely for fun, it nonetheless runs the full GenAI filmmaking stack end-to-end: star frames hand-crafted in Nano Banana to fix character and world, motion generated with Seedance 2, and the whole thing stitched and graded in Premiere Pro.

Proof, I think, that the medium is ready for genre; not just spectacle. The kind of work that once required a studio, a crew, and a year, now within reach of a small AI-native team.`,
    heroVideo: "../../video/tale-of-twins-hero.mp4",
    heroFallback: "../../images/tale-of-twins/thumb.webp",
    gallery: [
      "../../images/tale-of-twins/twins-forest-run.webp",
      "../../images/tale-of-twins/yin-yang-cats.webp",
      "../../images/tale-of-twins/bamboo-forest.webp",
      "../../images/tale-of-twins/mountain-village.webp",
      "../../images/tale-of-twins/white-cat-ruins.webp",
      "../../images/tale-of-twins/wuxia-village.webp",
      "../../images/tale-of-twins/desert-fight.webp",
      "../../images/tale-of-twins/tavern.webp",
      "../../images/tale-of-twins/cherry-blossom.webp",
      "../../images/tale-of-twins/desert-camp.webp",
      "../../images/tale-of-twins/duel.webp"
    ],
    links: [
      { label: "Watch the film", url: "https://www.youtube.com/watch?v=u2bsxG1hylc", primary: true }
    ]
  },
  {
    id: "slumbr",
    index: "08",
    title: "Slumbr",
    category: "Vibe-Coding",
    type: "Vibe Coding",
    skills: ["AI Prompting", "Graphic Design", "Vibe-Coding"],
    tagline: "A free, top-tier sleep meditation and white noise machine. Calibrated for deep rest.",
    description: `Slumbr is a free vibe-coded web app for sleep, meditation, and dream work. A small fix for a real gap at the lower end of the market: quality, lightweight, offline sleep-sounds and white-noise without ads, accounts, or paywalls. Built through agentic orchestration; I directed, Claude built. The same pipeline turns into a new kind of brand deliverable: apps, games, and tools that earn engagement a static ad never could.`,
    heroImage: "../../images/code2.png",
    gallery: [],
    links: [
      { label: "Use Slumbr", url: "https://mikewhyle.com/slumbr/", primary: true }
    ]
  },
  {
    id: "afrikan-tarot",
    index: "09",
    title: "Afrikan Tarot",
    category: "Vibe-Coding",
    type: "Vibe Coding",
    skills: ["AI Prompting", "Graphic Design", "Vibe-Coding"],
    tagline: "Free, no-gatekeeping wisdom from the cosmos. On tap.",
    description: `Afrikan Tarot is a free web-based tarot reading experience rooted in African symbolism and cosmology. No subscriptions, no paywalls. The wisdom is there for whoever comes seeking it. A small example of the kind of interactive piece brands can now commission instead of yet another banner ad.`,
    heroImage: "../../images/code1.png",
    gallery: [],
    links: [
      { label: "Read your cards", url: "https://mikewhyle.com/tarot/", primary: true }
    ]
  },
  {
    id: "mystik-skies",
    index: "10",
    title: "Mystik Skies",
    category: "Vibe-Coding",
    type: "Vibe Coding",
    skills: ["AI Prompting", "Vibe-Coding", "Game Design"],
    tagline: "Vibe-coded games and early Unreal Engine solo dev work.",
    description: `Mystik Skies sits at the intersection of vibe-coding and solo game development. Playable browser games built through agentic workflows, alongside longer-form projects developing in Unreal Engine, exploring what it means to be a one-person studio in the age of AI-assisted creation. The same toolkit unlocks a new shelf of brand deliverables: playable ads, branded mini-games, interactive worlds.`,
    heroImage: "../../images/code0.png",
    gallery: [],
    links: [
      { label: "Play Skybaby", url: "https://threapchills.github.io/skybaby/", primary: true }
    ]
  },
  {
    id: "video-archive",
    index: "11",
    title: "More Films",
    category: "GenAI Filmmaking",
    type: "Personal",
    skills: ["AI Prompting", "Visual Storytelling"],
    tagline: "The rest of the reel: experiments, shorts, and work in progress.",
    description: `An ongoing archive of GenAI filmmaking work: anime-influenced short films, experimental pieces, and various explorations of what AI video generation can do when given an actual aesthetic direction rather than a prompt list.`,
    heroImage: "../../images/motionfold.png",
    videos: [
      "https://www.youtube.com/watch?v=JgBicFpTIDM",
      "https://www.youtube.com/watch?v=hQ7ZkjxpdIQ",
      "https://drive.google.com/file/d/1r6bXQpUGQ1G8Uphgd9ugZbrKlqFH_IwH/view?usp=sharing",
      "https://drive.google.com/file/d/1t40QjErBrtredC6FVyrHR_l8RmNu-_28/view?usp=sharing",
      "https://drive.google.com/file/d/1mb8nkdVeINYfRv6zsze-KKhV_VH_cDxH/view?usp=sharing",
      "https://drive.google.com/file/d/1J_j_Z7Lu_V6eloxoYpKqr4vLmh4FG9ZB/view?usp=sharing",
      "https://drive.google.com/file/d/1qkm1kRKqVQTI9aZI8P1OtqdwyfGhTXjA/view?usp=sharing",
      "https://youtu.be/5jpuoFmo-DY",
      "https://youtube.com/shorts/Hh5Opro2tgo?feature=share",
      "https://www.youtube.com/watch?v=iDio-suJ57k"
    ],
    links: []
  }
];

/* ============================================================
   2026 OVERHAUL EXTENSIONS - additive only.
   Existing PROJECTS entries above are untouched; these maps
   decorate them at load with chamber routing fields.
   ============================================================ */

const CHAMBER_MAP = {
  "kalimba":       { chamber: "film",    chamberOrder: 1, rackLoop: "video/kalimba-hero.mp4" },
  "ramses":        { chamber: "film",    chamberOrder: 2, rackLoop: "video/ramses-hero.mp4" },
  "ice-tea":       { chamber: "film",    chamberOrder: 3, rackLoop: "video/ice-tea-hero.mp4" },
  "tale-of-twins": { chamber: "film",    chamberOrder: 4, rackLoop: "video/tale-of-twins-hero.mp4" },
  "video-archive": { chamber: "film",    chamberOrder: 5 },
  "mythopoeic":    { chamber: "design",  chamberOrder: 1 },
  "healthtech":    { chamber: "design",  chamberOrder: 2 },
  "writing":       { chamber: "writing", chamberOrder: 1 },
  "slumbr":        { chamber: "coding",  chamberOrder: 1 },
  "afrikan-tarot": { chamber: "coding",  chamberOrder: 2 },
  "mystik-skies":  { chamber: "coding",  chamberOrder: 3 }
};
PROJECTS.forEach(function (p) {
  var extra = CHAMBER_MAP[p.id];
  if (extra) Object.assign(p, extra);
});

/* Writing cube faces: collections referencing the existing article
   objects in the writing project's stories array, untouched. */
const WRITING_FACES = (function () {
  var w = PROJECTS.find(function (p) { return p.id === "writing"; });
  var byTitle = function (t) {
    return w.stories.find(function (s) { return s.title === t; });
  };
  return [
    {
      id: "newsdrop",
      title: "The News Drop",
      eyebrow: "The weekly AI dispatch",
      type: "newsdrop"
    },
    {
      id: "commentary",
      title: "Commentary",
      eyebrow: "Published articles",
      type: "stories",
      items: [
        byTitle("The AI detector dilemma"),
        byTitle("Why you can't trust Grok 4's benchmarks"),
        byTitle("What in the SMR is this?!"),
        byTitle("What's causing the skyrocketing demand for compute?"),
        byTitle("Blood, books and bots: the true origins of AI")
      ]
    },
    {
      id: "client",
      title: "Client work",
      eyebrow: "Commissioned writing",
      type: "stories",
      items: [
        byTitle("The future of insurance in Africa"),
        byTitle("Pioneering progress")
      ]
    },
    {
      id: "longform",
      title: "Longform",
      eyebrow: "Essays and other creatures",
      type: "stories",
      items: [
        byTitle("Risen from the sea")
      ]
    }
  ];
})();
