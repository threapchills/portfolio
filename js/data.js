/* ============================================================
   PROJECT DATA — single source of truth
   Edit here to update project info across the whole site.
   ============================================================ */

const PROJECTS = [
  {
    id: "kalimba",
    index: "01",
    title: "Kalimba",
    category: "GenAI Filmmaking",
    type: "Personal — Competition",
    skills: ["AI Prompting", "Visual Storytelling", "Writing", "Graphic Design"],
    tagline: "An Afrofuturist mockumentary shortlisted from 400+ entries.",
    description: `Proud to share that KALIMBA, a GenAI film I made, was shortlisted amongst 400+ entries in the BrandTech Group GenAI film competition and awarded $1,000.

KALIMBA is an Afrofuturist mockumentary in which the ordinary collides with the mythic: a South African innovator discovers a way to measure and record consciousness. The story is told through a surreal chromatic journey, juxtaposing the biblical and the digital, where AI-generated environments morph as fluidly as the soul of the film's protagonist.

I tried to craft something symbolic and layered — a philosophical allegory that leans into what generative filmmaking can actually do when you use it for quiet, intentional storytelling as opposed to loud chaotic spectacle.`,
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
    id: "mythopoeic",
    index: "02",
    title: "Mythopoeic",
    category: "Graphic Design",
    type: "Client — Pencil AI",
    skills: ["Graphic Design", "AI Prompting", "Brand Building", "Visual Storytelling"],
    tagline: "A speculative jewellery brand demonstrating the power of AI for advertising and visual identity.",
    description: `A fake jewellery brand built entirely with AI tools, commissioned to showcase what AI-powered advertising, branding, and visual storytelling can achieve at the highest end of the market. The result: a fully realised luxury identity — editorial imagery, product visualisation, campaign assets — indistinguishable from a six-figure production budget.`,
    heroSlides: [
      "../../images/mythopoeic/hero1.webp",
      "../../images/mythopoeic/hero2.webp",
      "../../images/mythopoeic/hero3.webp",
      "../../images/mythopoeic/hero4.webp",
      "../../images/mythopoeic/hero5.webp",
      "../../images/mythopoeic/hero6.webp"
    ],
    gallery: [
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
    links: []
  },
  {
    id: "little-big-island",
    index: "03",
    title: "Little Big Island",
    category: "GenAI Filmmaking",
    type: "Personal",
    skills: ["AI Prompting", "Visual Storytelling"],
    tagline: "A faux CGI-animated film trailer built with cutting-edge AI video tools.",
    description: `Little Big Island is a faux CGI-animated style film trailer, pushing the limits of what current AI video generation can produce. Shot using Seedance 2 and Veo 3.1, it explores a lush, expansive world that feels simultaneously handcrafted and machine-dreamed — a proof of concept for what generative filmmaking looks like when you treat it as a medium rather than a shortcut.`,
    heroVideo: "../../video/vast-island-hero.mp4",
    heroFallback: "../../images/vast-island/Exquisite_modern_disney_2k_202602152353-2.webp",
    gallery: [
      "../../images/vast-island/Exquisite_modern_disney_2k_202602152357.webp",
      "../../images/vast-island/Exquisite_modern_disney_2k_202602160004.webp",
      "../../images/vast-island/Exquisite_modern_disney_2k_202602160018.webp",
      "../../images/vast-island/Exquisite_modern_disney_2k_202602160018-1.webp",
      "../../images/vast-island/Exquisite_modern_disney_2k_202602160103.webp"
    ],
    links: [
      { label: "Watch the trailer", url: "https://www.youtube.com/watch?v=JgBicFpTIDM", primary: true }
    ]
  },
  {
    id: "vanta-black",
    index: "04",
    title: "Vanta Black Fanta Black",
    category: "GenAI Filmmaking",
    type: "Personal / Spec Ad",
    skills: ["AI Prompting", "Graphic Design", "Visual Storytelling"],
    tagline: "A spec ad for a non-existent cooldrink. Because why not.",
    description: `A fun spec ad for a non-existent variant of a popular cooldrink, designed to test the limits of AI filmmaking and revel in the creative space it opens up. Vanta Black Fanta Black exists nowhere except in the imagination — and now on screen.`,
    heroImage: "../../images/vanta-hero.webp",
    gallery: [],
    links: [
      { label: "Watch the ad", url: "https://drive.google.com/file/d/1mb8nkdVeINYfRv6zsze-KKhV_VH_cDxH/view?usp=sharing", primary: true }
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
    description: `Recent design work across three healthtech clients at various stages of growth. Each brand required a distinct visual language — from accessible edtech to clinical travel medicine to the speculative territory of digital twin technology — unified by a design sensibility that makes complex ideas feel approachable without dumbing them down.`,
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
    id: "slumbr",
    index: "06",
    title: "Slumbr",
    category: "Vibe-Coding",
    type: "Personal",
    skills: ["AI Prompting", "Graphic Design", "Vibe-Coding"],
    tagline: "A free, top-tier sleep meditation and white noise machine. Calibrated for deep rest.",
    description: `Slumbr is a vibe-coded web app for sleep, meditation, and dream work. Free, no gatekeeping, no accounts — just deep sound environments and guided sessions designed around actual rest science. Built entirely through agentic orchestration; I directed, Claude built.`,
    heroImage: "../../images/code2.png",
    gallery: [],
    links: [
      { label: "Use Slumbr", url: "https://mikewhyle.com/slumbr/", primary: true }
    ]
  },
  {
    id: "afrikan-tarot",
    index: "07",
    title: "Afrikan Tarot",
    category: "Vibe-Coding",
    type: "Personal",
    skills: ["AI Prompting", "Graphic Design", "Vibe-Coding"],
    tagline: "Free, no-gatekeeping wisdom from the cosmos. On tap.",
    description: `Afrikan Tarot is a free web-based tarot reading experience rooted in African symbolism and cosmology. No subscriptions, no paywalls — the wisdom is there for whoever comes seeking it.`,
    heroImage: "../../images/code1.png",
    gallery: [],
    links: [
      { label: "Read your cards", url: "https://mikewhyle.com/tarot/", primary: true }
    ]
  },
  {
    id: "mystik-skies",
    index: "08",
    title: "Mystik Skies",
    category: "Vibe-Coding",
    type: "Personal",
    skills: ["AI Prompting", "Vibe-Coding", "Game Design"],
    tagline: "Vibe-coded games and early Unreal Engine solo dev work.",
    description: `Mystik Skies sits at the intersection of vibe-coding and solo game development. Playable browser games built through agentic workflows, alongside longer-form projects developing in Unreal Engine — exploring what it means to be a one-person studio in the age of AI-assisted creation.`,
    heroImage: "../../images/code0.png",
    gallery: [],
    links: [
      { label: "Play Skybaby", url: "https://threapchills.github.io/skybaby/", primary: true }
    ]
  },
  {
    id: "writing",
    index: "09",
    title: "Writing",
    category: "Writing",
    type: "Client + Personal",
    skills: ["Content Writing", "Copywriting", "Research", "Thought Leadership"],
    tagline: "Technology, AI, and Africa — reported and argued from Cape Town.",
    description: `A selection of articles spanning AI criticism, technology infrastructure, African innovation, and speculative futures. Written for publications and personal channels; always from a position of genuine curiosity rather than press release repackaging.`,
    heroImage: "../../images/design01.png",
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
    id: "video-archive",
    index: "10",
    title: "More Films",
    category: "GenAI Filmmaking",
    type: "Personal",
    skills: ["AI Prompting", "Visual Storytelling"],
    tagline: "The rest of the reel — experiments, shorts, and work in progress.",
    description: `An ongoing archive of GenAI filmmaking work: anime-influenced short films, experimental pieces, and various explorations of what AI video generation can do when given an actual aesthetic direction rather than a prompt list.`,
    heroImage: "../../images/motionfold.png",
    videos: [
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
