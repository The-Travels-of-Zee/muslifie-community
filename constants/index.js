export const allPosts = [
  {
    id: 1,
    user: { name: "Ahmad Hassan", profileImage: "👤", joinDate: "2024-01-15" },
    createdAt: "2024-08-20T10:30:00Z",
    title: "Best halal restaurants in Istanbul?",
    content:
      "Planning a trip to Istanbul next month. Looking for recommendations for authentic halal Turkish cuisine. Particularly interested in places near Sultanahmet area.",
    images: [],
    upvotes: 24,
    downvotes: 2,
    likes: 20,
    comments: [
      {
        id: 1,
        user: { name: "Fatima Ali", profileImage: "👩" },
        content: "Pandeli Restaurant near Spice Bazaar is excellent! Family-run for generations.",
        createdAt: "2024-08-20T11:15:00Z",
        replies: [
          {
            id: 11,
            user: { name: "Omar Khan", profileImage: "👨" },
            content: "Second this! Their lamb dishes are incredible.",
            createdAt: "2024-08-20T11:30:00Z",
          },
        ],
      },
      {
        id: 2,
        user: { name: "Yusuf Demir", profileImage: "👨‍🦱" },
        content: "Try Hamdi Restaurant for the best kebabs. Located in Eminönü.",
        createdAt: "2024-08-20T12:00:00Z",
      },
      {
        id: 3,
        user: { name: "Aisha Rahman", profileImage: "👱‍♀️" },
        content: "Don't miss Süleymaniye Kuru Fasulye for traditional Ottoman beans!",
        createdAt: "2024-08-20T13:45:00Z",
      },
    ],
  },
  {
    id: 2,
    user: { name: "Sarah Mohamed", profileImage: "👩‍🦱", joinDate: "2024-02-10" },
    createdAt: "2024-08-21T14:20:00Z",
    title: "Prayer facilities at Barcelona Airport?",
    content:
      "Has anyone recently traveled through Barcelona Airport? Are there dedicated prayer rooms or quiet spaces available? Flying there next week.",
    images: [],
    upvotes: 38,
    downvotes: 0,
    likes: 10,
    comments: [
      {
        id: 4,
        user: { name: "Ibrahim Torres", profileImage: "👨‍🦳" },
        content: "Yes! Terminal 1 has a multi-faith room on level 0. Very clean and peaceful.",
        createdAt: "2024-08-21T15:00:00Z",
        replies: [
          {
            id: 41,
            user: { name: "Sarah Mohamed", profileImage: "👩‍🦱" },
            content: "Thank you so much! That's very helpful.",
            createdAt: "2024-08-21T15:15:00Z",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    user: { name: "Rashid Al-Zahra", profileImage: "👨‍🎓", joinDate: "2024-03-05" },
    createdAt: "2024-08-22T09:10:00Z",
    title: "Tokyo halal food guide - 3 days itinerary",
    content:
      "Just returned from an amazing 3-day trip to Tokyo. Sharing my halal food discoveries for fellow travelers. The ramen scene has really improved for Muslims!",
    images: ["https://images.unsplash.com/photo-1554978991-33ef7f31d658?w=400&h=300&fit=crop"],
    upvotes: 55,
    downvotes: 1,
    likes: 40,
    comments: [
      {
        id: 5,
        user: { name: "Layla Tanaka", profileImage: "👩‍💼" },
        content: "This is so detailed! Could you share the ramen places specifically?",
        createdAt: "2024-08-22T10:30:00Z",
      },
      {
        id: 6,
        user: { name: "Hassan Ali", profileImage: "👨‍💻" },
        content: "Amazing post! Adding all these to my Tokyo list.",
        createdAt: "2024-08-22T11:45:00Z",
      },
    ],
  },
];

export const myPosts = [
  {
    id: 101,
    user: { name: "Your Name", profileImage: "🧑", joinDate: "2024-04-12" },
    createdAt: "2024-08-25T09:20:00Z",
    title: "Best halal cafes in London?",
    content:
      "Looking for cozy halal-friendly cafes in London where I can work remotely. Preferably places with good WiFi and coffee.",
    images: [],
    upvotes: 12,
    downvotes: 1,
    likes: 20,
    comments: [
      {
        id: 201,
        user: { name: "Ali Khan", profileImage: "👨" },
        content: "Check out The Canvas Café in Shoreditch. Great vibes and halal options.",
        createdAt: "2024-08-25T10:00:00Z",
      },
      {
        id: 202,
        user: { name: "Maryam Patel", profileImage: "👩" },
        content: "I love Grounded Coffee in Whitechapel. Perfect for working!",
        createdAt: "2024-08-25T11:15:00Z",
      },
    ],
  },
  {
    id: 102,
    user: { name: "Your Name", profileImage: "🧑", joinDate: "2024-04-12" },
    createdAt: "2024-08-27T16:45:00Z",
    title: "Tips for halal food in Paris?",
    content:
      "Planning a weekend in Paris. Aside from the famous places, any underrated halal restaurants worth checking out?",
    images: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"],
    upvotes: 20,
    downvotes: 3,
    likes: 20,
    comments: [
      {
        id: 203,
        user: { name: "Samir Hassan", profileImage: "👨‍🦱" },
        content: "Le Butcher near Gare du Nord is fantastic for halal burgers.",
        createdAt: "2024-08-27T17:10:00Z",
        replies: [
          {
            id: 204,
            user: { name: "Your Name", profileImage: "🧑" },
            content: "Awesome, thanks for the recommendation!",
            createdAt: "2024-08-27T17:20:00Z",
          },
        ],
      },
    ],
  },
  {
    id: 103,
    user: { name: "Your Name", profileImage: "🧑", joinDate: "2024-04-12" },
    createdAt: "2024-08-30T08:00:00Z",
    title: "Halal travel in Bali – any tips?",
    content: "Thinking of visiting Bali later this year. Curious about halal food availability and nearby mosques.",
    images: [],
    upvotes: 8,
    downvotes: 0,
    likes: 20,
    comments: [
      {
        id: 205,
        user: { name: "Ayesha Noor", profileImage: "👩‍🦰" },
        content: "Most areas in Bali have halal warungs. Denpasar especially has many options.",
        createdAt: "2024-08-30T09:10:00Z",
      },
      {
        id: 206,
        user: { name: "Imran Yusuf", profileImage: "👨‍🦳" },
        content: "Nusa Dua is very Muslim-friendly with prayer facilities in hotels.",
        createdAt: "2024-08-30T09:45:00Z",
      },
    ],
  },
];
