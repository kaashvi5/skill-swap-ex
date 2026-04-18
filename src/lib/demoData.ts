// Static demo data shown alongside real data so the app feels alive
// even with few real users. All IDs are prefixed "demo-" so we never
// confuse them with real Supabase rows.

export interface DemoUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  country: string;
  city: string;
  trust_score: number;
  ratings_count: number;
  teach: { skill: string; level: string; proof_url: string | null }[];
  learn: { skill: string }[];
}

const av = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

export const DEMO_USERS: DemoUser[] = [
  { user_id: "demo-1", full_name: "Aiko Tanaka", avatar_url: av("aiko"), bio: "Tokyo-based illustrator, love teaching digital art.", country: "Japan", city: "Tokyo", trust_score: 4.9, ratings_count: 32,
    teach: [{ skill: "Digital Illustration", level: "expert", proof_url: "#" }, { skill: "Procreate", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Spanish" }, { skill: "Yoga" }] },
  { user_id: "demo-2", full_name: "Marcus Müller", avatar_url: av("marcus"), bio: "Full-stack dev, opensource contributor.", country: "Germany", city: "Berlin", trust_score: 4.8, ratings_count: 47,
    teach: [{ skill: "React", level: "expert", proof_url: "#" }, { skill: "TypeScript", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Guitar" }, { skill: "French" }] },
  { user_id: "demo-3", full_name: "Priya Sharma", avatar_url: av("priya"), bio: "Classical singer & Hindi teacher.", country: "India", city: "Bengaluru", trust_score: 4.7, ratings_count: 28,
    teach: [{ skill: "Hindi", level: "expert", proof_url: "#" }, { skill: "Indian Classical Singing", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Photography" }, { skill: "Italian" }] },
  { user_id: "demo-4", full_name: "Lucas Oliveira", avatar_url: av("lucas"), bio: "Brazilian guitarist & producer.", country: "Brazil", city: "São Paulo", trust_score: 4.9, ratings_count: 51,
    teach: [{ skill: "Guitar", level: "expert", proof_url: "#" }, { skill: "Portuguese", level: "intermediate", proof_url: null }],
    learn: [{ skill: "English" }, { skill: "Music Production" }] },
  { user_id: "demo-5", full_name: "Sofía Reyes", avatar_url: av("sofia"), bio: "Polyglot — Spanish, English, French.", country: "Mexico", city: "Mexico City", trust_score: 4.6, ratings_count: 19,
    teach: [{ skill: "Spanish", level: "expert", proof_url: "#" }, { skill: "Salsa Dance", level: "intermediate", proof_url: null }],
    learn: [{ skill: "Korean" }, { skill: "Watercolor" }] },
  { user_id: "demo-6", full_name: "Chen Wei", avatar_url: av("chen"), bio: "Mandarin tutor & calligraphy artist.", country: "China", city: "Shanghai", trust_score: 4.8, ratings_count: 36,
    teach: [{ skill: "Mandarin", level: "expert", proof_url: "#" }, { skill: "Calligraphy", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Public Speaking" }, { skill: "Cooking" }] },
  { user_id: "demo-7", full_name: "Amara Okafor", avatar_url: av("amara"), bio: "Photographer & UX mentor.", country: "Nigeria", city: "Lagos", trust_score: 4.7, ratings_count: 24,
    teach: [{ skill: "Photography", level: "expert", proof_url: "#" }, { skill: "UX Design", level: "intermediate", proof_url: "#" }],
    learn: [{ skill: "Python" }, { skill: "French" }] },
  { user_id: "demo-8", full_name: "Liam O'Connor", avatar_url: av("liam"), bio: "Yoga instructor 🧘 traveling the world.", country: "Ireland", city: "Dublin", trust_score: 5.0, ratings_count: 62,
    teach: [{ skill: "Yoga", level: "expert", proof_url: "#" }, { skill: "Meditation", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Surfing" }, { skill: "Japanese" }] },
  { user_id: "demo-9", full_name: "Élodie Laurent", avatar_url: av("elodie"), bio: "Pâtissière & French teacher.", country: "France", city: "Paris", trust_score: 4.9, ratings_count: 41,
    teach: [{ skill: "French", level: "expert", proof_url: "#" }, { skill: "Baking", level: "expert", proof_url: "#" }],
    learn: [{ skill: "English" }, { skill: "Pottery" }] },
  { user_id: "demo-10", full_name: "Noah Cohen", avatar_url: av("noah"), bio: "ML engineer who loves teaching.", country: "Israel", city: "Tel Aviv", trust_score: 4.8, ratings_count: 33,
    teach: [{ skill: "Python", level: "expert", proof_url: "#" }, { skill: "Machine Learning", level: "expert", proof_url: "#" }],
    learn: [{ skill: "Guitar" }, { skill: "Arabic" }] },
  { user_id: "demo-11", full_name: "Zara Ahmed", avatar_url: av("zara"), bio: "Pakistani writer & poet.", country: "Pakistan", city: "Lahore", trust_score: 4.7, ratings_count: 22,
    teach: [{ skill: "Creative Writing", level: "expert", proof_url: "#" }, { skill: "Urdu", level: "expert", proof_url: null }],
    learn: [{ skill: "Drawing" }, { skill: "Spanish" }] },
  { user_id: "demo-12", full_name: "Henrik Larsson", avatar_url: av("henrik"), bio: "Carpentry, woodwork & Swedish.", country: "Sweden", city: "Stockholm", trust_score: 4.6, ratings_count: 17,
    teach: [{ skill: "Woodworking", level: "expert", proof_url: "#" }, { skill: "Swedish", level: "expert", proof_url: null }],
    learn: [{ skill: "Italian" }, { skill: "Photography" }] },
];

export interface DemoChat {
  id: string;
  other: { user_id: string; full_name: string; avatar_url: string };
  request_skill: string;
  offer_skill: string;
  status: "pending" | "accepted" | "completed";
  preview: string;
  unread: number;
  messages: { sender: "me" | "them"; body: string; time: string }[];
}

export const DEMO_CHATS: DemoChat[] = [
  {
    id: "demo-chat-1",
    other: { user_id: "demo-2", full_name: "Marcus Müller", avatar_url: av("marcus") },
    request_skill: "React", offer_skill: "Photography", status: "accepted",
    preview: "Awesome! Let's do the next session on hooks 🎯",
    unread: 2,
    messages: [
      { sender: "them", body: "Hey! Excited to swap React for photography 📸", time: "10:02" },
      { sender: "me", body: "Same here! When are you free this week?", time: "10:05" },
      { sender: "them", body: "Thursday 6pm CET works for me. We can start with useState/useEffect.", time: "10:07" },
      { sender: "me", body: "Perfect. I'll prep a portrait lighting demo for you 💡", time: "10:09" },
      { sender: "them", body: "Awesome! Let's do the next session on hooks 🎯", time: "10:12" },
    ],
  },
  {
    id: "demo-chat-2",
    other: { user_id: "demo-4", full_name: "Lucas Oliveira", avatar_url: av("lucas") },
    request_skill: "Guitar", offer_skill: "English", status: "accepted",
    preview: "Thanks! That chord progression finally clicked 🎸",
    unread: 0,
    messages: [
      { sender: "me", body: "Bom dia Lucas! Ready for our weekly swap?", time: "Yesterday" },
      { sender: "them", body: "Yes! I have the Am - F - C - G progression ready for you.", time: "Yesterday" },
      { sender: "me", body: "I'll teach you English idioms today — 'piece of cake' 🍰", time: "Yesterday" },
      { sender: "them", body: "Thanks! That chord progression finally clicked 🎸", time: "Today" },
    ],
  },
  {
    id: "demo-chat-3",
    other: { user_id: "demo-5", full_name: "Sofía Reyes", avatar_url: av("sofia") },
    request_skill: "Spanish", offer_skill: "Web Design", status: "pending",
    preview: "Hola! I'd love to swap Spanish lessons for web design tips ✨",
    unread: 1,
    messages: [
      { sender: "them", body: "Hola! I'd love to swap Spanish lessons for web design tips ✨", time: "2h ago" },
    ],
  },
  {
    id: "demo-chat-4",
    other: { user_id: "demo-8", full_name: "Liam O'Connor", avatar_url: av("liam") },
    request_skill: "Yoga", offer_skill: "Cooking", status: "completed",
    preview: "Session complete — certificate issued 🎉",
    unread: 0,
    messages: [
      { sender: "them", body: "Namaste 🙏 ready for sun salutations?", time: "Last week" },
      { sender: "me", body: "Born ready! After this I'll teach you risotto.", time: "Last week" },
      { sender: "them", body: "Loved the class. Risotto was 🤌", time: "Last week" },
      { sender: "me", body: "Marking complete!", time: "Last week" },
      { sender: "them", body: "Session complete — certificate issued 🎉", time: "Last week" },
    ],
  },
];

export interface DemoCert {
  id: string;
  skill: string;
  teacher: string;
  issued_at: string;
}

export const DEMO_CERTS: DemoCert[] = [
  { id: "demo-cert-1", skill: "Yoga Fundamentals", teacher: "Liam O'Connor", issued_at: "2025-09-12" },
  { id: "demo-cert-2", skill: "Conversational French", teacher: "Élodie Laurent", issued_at: "2025-10-03" },
  { id: "demo-cert-3", skill: "Acoustic Guitar Basics", teacher: "Lucas Oliveira", issued_at: "2025-11-21" },
];

export const DEMO_ACTIVITY = [
  { who: "Aiko Tanaka", action: "completed a swap with", target: "Noah Cohen", skill: "Procreate ↔ Python", time: "2h ago" },
  { who: "Marcus Müller", action: "earned a 5★ rating from", target: "Priya Sharma", skill: "React mentorship", time: "5h ago" },
  { who: "Liam O'Connor", action: "issued a certificate to", target: "you", skill: "Yoga Fundamentals", time: "Yesterday" },
  { who: "Sofía Reyes", action: "joined SkillSwap from", target: "Mexico City 🇲🇽", skill: "", time: "2d ago" },
];
