import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Ensure db.json exists with seed data
const SEED_DATA = {
  users: [
    {
      id: "admin",
      username: "CeliaAdmin",
      email: "celia970105@gmail.com",
      password: "Aa0955283881",
      role: "admin",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=celia",
      background: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200"
    },
    {
      id: "user_zack",
      username: "ZackLover",
      email: "zack@starry.com",
      password: "password123",
      role: "user",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zack",
      background: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200"
    },
    {
      id: "user_jeremy",
      username: "JeremyFan",
      email: "jeremy@starry.com",
      password: "password123",
      role: "user",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jeremy",
      background: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200"
    },
    {
      id: "user_star",
      username: "MarshmallowStar",
      email: "star@starry.com",
      password: "password123",
      role: "user",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Star",
      background: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200"
    }
  ],
  posts_photos: [],
  posts_videos: [],
  posts_letters: [],
  posts_artworks: [],
  posts_music: [],
  pets: [],
  friendships: [] as any[],
  coparent_groups: [] as any[]
};

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), "utf8");
      return SEED_DATA;
    }
    const content = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(content);
    
    // Ensure all tables exist
    let modified = false;
    if (!data.friendships) {
      data.friendships = [];
      modified = true;
    }
    if (!data.coparent_groups) {
      data.coparent_groups = [];
      modified = true;
    }
    if (!data.users) {
      data.users = SEED_DATA.users;
      modified = true;
    }

    // Insert any missing seeded users
    SEED_DATA.users.forEach(seedUser => {
      if (!data.users.some((u: any) => u.email === seedUser.email)) {
        data.users.push(seedUser);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    }
    return data;
  } catch (err) {
    console.error("Error reading database file, resetting to seeds", err);
    return SEED_DATA;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// Ensure database is initialized at start
readDb();

app.use(express.json());

// API Routes

// Debug API to get everything
app.get("/api/db", (req, res) => {
  res.json(readDb());
});

// Auth API: login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Auth API: register
app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const db = readDb();
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: "Email already registered" });
  }
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: "Username is already taken" });
  }

  const isFirstAdmin = email === "admin@starry.com";
  const newUser = {
    id: String(db.users.length + 1),
    username,
    email,
    password,
    role: isFirstAdmin ? "admin" : "user",
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    background: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200"
  };

  db.users.push(newUser);

  // If registering a regular user, also create a starter pet for them!
  if (!isFirstAdmin) {
    const starterPet = {
      id: `pet_${Date.now()}`,
      name: `${username}'s Pet`,
      owner_id: newUser.id,
      owner_name: username,
      xp: 0,
      level: 1,
      type: "Star Bunny",
      color: "Pink",
      custom_appearance: { accessory: "None", vibe: "Cute" },
      home_json: { decor: "Stardust", bed: "Cloud Bed" },
      created_at: new Date().toISOString()
    };
    db.pets.push(starterPet);
  }

  writeDb(db);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword });
});

// User Profile Update
app.post("/api/users/update", (req, res) => {
  const { userId, username, avatar, background } = req.body;
  const db = readDb();
  const userIdx = db.users.findIndex(u => u.id === userId);
  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (username) {
    // Check duplication excluding self
    const isTaken = db.users.some(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase());
    if (isTaken) {
      return res.status(400).json({ error: "Username already taken" });
    }
    db.users[userIdx].username = username;
  }
  if (avatar) db.users[userIdx].avatar = avatar;
  if (background) db.users[userIdx].background = background;

  writeDb(db);

  const { password: _, ...userWithoutPassword } = db.users[userIdx];
  res.json({ user: userWithoutPassword });
});

// Submissions GET by type
app.get("/api/posts/:type", (req, res) => {
  const { type } = req.params;
  const db = readDb();
  
  let collection: any[] = [];
  if (type === "photos") collection = db.posts_photos;
  else if (type === "videos") collection = db.posts_videos;
  else if (type === "letters") collection = db.posts_letters;
  else if (type === "artworks") collection = db.posts_artworks;
  else if (type === "music") collection = db.posts_music;
  else {
    return res.status(400).json({ error: "Invalid post type" });
  }

  // Filter approved items for public viewing
  const approvedItems = collection.filter((item: any) => item.status === "approved");
  res.json(approvedItems);
});

// Submissions POST (Submit new content)
app.post("/api/posts/:type", (req, res) => {
  const { type } = req.params;
  const { payload } = req.body;
  const db = readDb();

  if (!payload) {
    return res.status(400).json({ error: "Payload is required" });
  }

  const isUserAdmin = payload.role === "admin";
  const newPostId = `${type.substring(0, 1)}_${Date.now()}`;
  
  const basePost = {
    id: newPostId,
    user_id: payload.user_id || "anonymous",
    username: payload.username || "Anonymous",
    status: isUserAdmin ? "approved" : "pending",
    created_at: new Date().toISOString()
  };

  if (type === "photos") {
    const post = {
      ...basePost,
      title: payload.title || "Untitled Photo",
      image_url: payload.image_url || "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
      year: payload.year || String(new Date().getFullYear()),
      category: payload.category || "General"
    };
    db.posts_photos.push(post);
    writeDb(db);
    return res.json({ success: true, post });
  } 
  
  if (type === "videos") {
    const post = {
      ...basePost,
      title: payload.title || "Untitled Video",
      video_url: payload.video_url || "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4",
      category: payload.category || "General"
    };
    db.posts_videos.push(post);
    writeDb(db);
    return res.json({ success: true, post });
  }

  if (type === "letters") {
    const post = {
      ...basePost,
      author_name: payload.is_anonymous ? "Anonymous Star" : (payload.author_name || payload.username || "Stardust"),
      content: payload.content || "",
      is_anonymous: Boolean(payload.is_anonymous),
      color_theme: payload.color_theme || "pink"
    };
    db.posts_letters.push(post);
    writeDb(db);
    return res.json({ success: true, post });
  }

  if (type === "artworks") {
    const post = {
      ...basePost,
      title: payload.title || "Untitled Artwork",
      image_url: payload.image_url || "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
      external_link: payload.external_link || "",
      description: payload.description || ""
    };
    db.posts_artworks.push(post);
    writeDb(db);
    return res.json({ success: true, post });
  }

  if (type === "music") {
    const post = {
      ...basePost,
      title: payload.title || "Untitled Song",
      artist: payload.artist || "Unknown Artist",
      audio_url: payload.audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      cover_url: payload.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500",
      duration: payload.duration || "3:30"
    };
    db.posts_music.push(post);
    writeDb(db);
    return res.json({ success: true, post });
  }

  return res.status(400).json({ error: "Invalid post type" });
});

// Admin Route: Get all pending items for moderation
app.get("/api/admin/pending", (req, res) => {
  const db = readDb();
  const pending = {
    photos: db.posts_photos.filter(p => p.status === "pending"),
    videos: db.posts_videos.filter(v => v.status === "pending"),
    letters: db.posts_letters.filter(l => l.status === "pending"),
    artworks: db.posts_artworks.filter(a => a.status === "pending"),
    music: db.posts_music.filter(m => m.status === "pending")
  };
  res.json(pending);
});

// Admin Route: Get all items of any status (for global deletion/management)
app.get("/api/admin/all", (req, res) => {
  const db = readDb();
  res.json({
    photos: db.posts_photos,
    videos: db.posts_videos,
    letters: db.posts_letters,
    artworks: db.posts_artworks,
    music: db.posts_music,
    users: db.users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, avatar: u.avatar })),
    pets: db.pets
  });
});

// Admin Route: Moderate (Approve/Reject/Delete)
app.post("/api/admin/action", (req, res) => {
  const { type, id, action } = req.body; // action: 'approve' | 'reject' | 'delete'
  const db = readDb();

  let collectionName: "posts_photos" | "posts_videos" | "posts_letters" | "posts_artworks" | "posts_music" | "users" | "pets" | null = null;
  if (type === "photos") collectionName = "posts_photos";
  else if (type === "videos") collectionName = "posts_videos";
  else if (type === "letters") collectionName = "posts_letters";
  else if (type === "artworks") collectionName = "posts_artworks";
  else if (type === "music") collectionName = "posts_music";
  else if (type === "users") collectionName = "users";
  else if (type === "pets") collectionName = "pets";

  if (!collectionName) {
    return res.status(400).json({ error: "Invalid item type" });
  }

  const collection = db[collectionName] as any[];
  const itemIdx = collection.findIndex(item => item.id === id);

  if (itemIdx === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (action === "approve") {
    collection[itemIdx].status = "approved";
  } else if (action === "reject") {
    collection[itemIdx].status = "rejected";
  } else if (action === "delete") {
    collection.splice(itemIdx, 1);
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }

  writeDb(db);
  res.json({ success: true, message: `Successfully executed ${action} on ${type}` });
});

// Admin Route: Reinforce full deletion permission
app.delete("/api/admin/delete-item", (req, res) => {
  const { type, id } = req.body;
  const db = readDb();

  let collectionName: "posts_photos" | "posts_videos" | "posts_letters" | "posts_artworks" | "posts_music" | "users" | "pets" | null = null;
  
  if (type === "photo" || type === "photos") collectionName = "posts_photos";
  else if (type === "video" || type === "videos") collectionName = "posts_videos";
  else if (type === "letter" || type === "letters") collectionName = "posts_letters";
  else if (type === "artwork" || type === "artworks") collectionName = "posts_artworks";
  else if (type === "music") collectionName = "posts_music";
  else if (type === "user" || type === "users") collectionName = "users";
  else if (type === "pet" || type === "pets") collectionName = "pets";

  if (!collectionName) {
    return res.status(400).json({ error: "Invalid item type" });
  }

  const collection = db[collectionName] as any[];
  const itemIdx = collection.findIndex(item => item.id === id);

  if (itemIdx === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  collection.splice(itemIdx, 1);
  writeDb(db);
  res.json({ success: true, message: `Successfully deleted ${type} with ID ${id}` });
});

// Pets API: Get all pets
app.get("/api/pets", (req, res) => {
  const db = readDb();
  res.json(db.pets);
});

// Pets API: Interact/Train/Feed pet (increases XP and levels up!)
app.post("/api/pets/interact", (req, res) => {
  const { petId, action } = req.body; // action: 'feed' | 'play' | 'train'
  const db = readDb();
  const petIdx = db.pets.findIndex(p => p.id === petId);
  if (petIdx === -1) {
    return res.status(404).json({ error: "Pet not found" });
  }

  let xpGained = 10;
  if (action === "feed") xpGained = 15;
  else if (action === "play") xpGained = 20;
  else if (action === "train") xpGained = 30;

  const pet = db.pets[petIdx];
  pet.xp += xpGained;

  // Level Up logic: each level needs level * 100 XP
  const xpNeeded = pet.level * 100;
  let leveledUp = false;
  if (pet.xp >= xpNeeded) {
    pet.xp -= xpNeeded;
    pet.level += 1;
    leveledUp = true;
  }

  writeDb(db);
  res.json({ success: true, pet, xpGained, leveledUp });
});

// Friends & Co-parenting APIs

// Get all users in the system (public info)
app.get("/api/users/list", (req, res) => {
  const db = readDb();
  const list = db.users.map((u: any) => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    email: u.email
  }));
  res.json(list);
});

// Add Friend
app.post("/api/friends/add", (req, res) => {
  const { userId, targetUsernameOrEmail } = req.body;
  if (!userId || !targetUsernameOrEmail) {
    return res.status(400).json({ error: "缺少參數" });
  }

  const db = readDb();
  const query = targetUsernameOrEmail.toLowerCase().trim();
  const targetUser = db.users.find(
    (u: any) => u.username.toLowerCase() === query || u.email.toLowerCase() === query
  );

  if (!targetUser) {
    return res.status(404).json({ error: "找不到該用戶，請檢查輸入的用戶名或 Email" });
  }

  if (targetUser.id === userId) {
    return res.status(400).json({ error: "不能加自己為好友喔！" });
  }

  // Check if already friends
  const alreadyFriends = db.friendships.some(
    (f: any) => (f.userId1 === userId && f.userId2 === targetUser.id) ||
                (f.userId1 === targetUser.id && f.userId2 === userId)
  );

  if (alreadyFriends) {
    return res.status(400).json({ error: "你們已經是好友囉！" });
  }

  db.friendships.push({ userId1: userId, userId2: targetUser.id });
  writeDb(db);

  res.json({ success: true, friend: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar } });
});

// Get Friends list
app.get("/api/friends/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  
  const friendships = db.friendships.filter(
    (f: any) => f.userId1 === userId || f.userId2 === userId
  );

  const friendIds = friendships.map((f: any) => f.userId1 === userId ? f.userId2 : f.userId1);
  const friends = db.users
    .filter((u: any) => friendIds.includes(u.id))
    .map((u: any) => ({ id: u.id, username: u.username, avatar: u.avatar }));

  res.json(friends);
});

// Get Co-parenting Groups
app.get("/api/coparent/groups/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  
  const userGroups = db.coparent_groups.filter(
    (g: any) => g.member_ids && g.member_ids.includes(userId)
  );

  res.json(userGroups);
});

// Create Co-parenting Group
app.post("/api/coparent/create", (req, res) => {
  const { name, creatorId, memberIds } = req.body;
  if (!name || !creatorId || !memberIds) {
    return res.status(400).json({ error: "缺少必要參數" });
  }

  const db = readDb();
  const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));
  if (uniqueMemberIds.length < 2 || uniqueMemberIds.length > 6) {
    return res.status(400).json({ error: "共同飼養人數限制為 2 ~ 6 人" });
  }

  const newGroup = {
    id: `group_${Date.now()}`,
    name,
    member_ids: uniqueMemberIds,
    star_coins: 100,
    pet: {
      name: "蜜桃粉萌星",
      fullness: 50,
      love: 50,
      furniture: [
        { id: "bed", name: "棉花糖蓬蓬床", x: 20, y: 150, description: "圓潤香甜的草莓棉花糖大床" },
        { id: "sofa", name: "蜜桃雲朵沙發", x: 190, y: 160, description: "像雲朵般舒適的圓角粉紅小沙發" },
        { id: "fridge", name: "草莓波點冰箱", x: 30, y: 55, description: "可以點擊查看美味食物的粉色小冰箱" }
      ]
    },
    refrigerator_food: {
      cotton_candy: 3,
      peach_juice: 3,
      star_macaron: 2,
      cherry_pudding: 2
    },
    photos: [
      {
        id: `photo_init_${Date.now()}`,
        user_id: creatorId,
        username: db.users.find((u: any) => u.id === creatorId)?.username || "創立者",
        image_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400",
        caption: "✨ 我們的粉紅小家正式成立啦！🌸",
        timestamp: new Date().toISOString()
      }
    ],
    last_photo_times: {} as any
  };

  db.coparent_groups.push(newGroup);
  writeDb(db);

  res.json({ success: true, group: newGroup });
});

// Execute Co-parenting Action (rename, move-furniture, buy-food, feed-pet, share-photo)
app.post("/api/coparent/action", (req, res) => {
  const { groupId, userId, actionType, payload } = req.body;
  if (!groupId || !actionType) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const db = readDb();
  const groupIdx = db.coparent_groups.findIndex((g: any) => g.id === groupId);
  if (groupIdx === -1) {
    return res.status(404).json({ error: "找不到該共同飼養家庭" });
  }

  const group = db.coparent_groups[groupIdx];

  if (userId && !group.member_ids.includes(userId)) {
    return res.status(403).json({ error: "你不是這個共同飼養家庭的成員喔" });
  }

  let message = "操作成功";

  if (actionType === "rename") {
    const { newName } = payload;
    if (newName && newName.trim()) {
      group.pet.name = newName.trim();
      message = `成功改名字為：${newName}`;
    }
  } 
  else if (actionType === "move-furniture") {
    const { furniture } = payload;
    if (furniture) {
      group.pet.furniture = furniture;
      message = "已更新家具擺放位置";
    }
  } 
  else if (actionType === "buy-food") {
    const { foodId, cost, count } = payload;
    if (group.star_coins < cost) {
      return res.status(400).json({ error: "星星幣不足，快上傳照片賺取吧！🪙" });
    }
    group.star_coins -= cost;
    if (!group.refrigerator_food) group.refrigerator_food = {};
    group.refrigerator_food[foodId] = (group.refrigerator_food[foodId] || 0) + count;
    message = `成功購入食物，已放入草莓冰箱！`;
  } 
  else if (actionType === "feed-pet") {
    const { foodId, fullnessVal, loveVal } = payload;
    if (!group.refrigerator_food || !group.refrigerator_food[foodId] || group.refrigerator_food[foodId] <= 0) {
      return res.status(400).json({ error: "冰箱裡沒有這個食物了，快去採購吧！🍰" });
    }
    
    if (group.pet.fullness >= 100) {
      return res.status(400).json({ error: `${group.pet.name} 已經吃飽飽囉！過一會再餵牠吧～🧸` });
    }

    group.refrigerator_food[foodId] -= 1;
    group.pet.fullness = Math.min(100, (group.pet.fullness || 0) + fullnessVal);
    group.pet.love = Math.min(100, (group.pet.love || 0) + loveVal);
    message = `成功餵食！飽腹度 +${fullnessVal}，幸福指數 +${loveVal} 🌸`;
  } 
  else if (actionType === "share-photo") {
    const { image_url, caption } = payload;
    if (!image_url) {
      return res.status(400).json({ error: "上傳的照片不能為空" });
    }

    // Cooldown check: hourly
    if (!group.last_photo_times) group.last_photo_times = {};
    const lastTimeStr = group.last_photo_times[userId];
    if (lastTimeStr) {
      const lastTime = new Date(lastTimeStr).getTime();
      const now = Date.now();
      const diffMs = now - lastTime;
      const oneHourMs = 60 * 60 * 1000;
      if (diffMs < oneHourMs) {
        const remainingMin = Math.ceil((oneHourMs - diffMs) / 60000);
        return res.status(400).json({ error: `上傳冷卻中！每小時限傳一張照片，請等待 ${remainingMin} 分鐘 ⏱️` });
      }
    }

    const coinsEarned = 50;
    group.star_coins = (group.star_coins || 0) + coinsEarned;
    group.last_photo_times[userId] = new Date().toISOString();

    const userObj = db.users.find((u: any) => u.id === userId);
    const newPhoto = {
      id: `photo_${Date.now()}`,
      user_id: userId,
      username: userObj?.username || "成員",
      image_url,
      caption: caption || "✨ 每日打卡粉色小家！📸",
      timestamp: new Date().toISOString()
    };

    if (!group.photos) group.photos = [];
    group.photos.unshift(newPhoto);

    message = `上傳成功！獲得了 ${coinsEarned} 星星幣 🪙！`;
  }

  db.coparent_groups[groupIdx] = group;
  writeDb(db);

  res.json({ success: true, group, message });
});

// Mount Vite / Static files
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  }).then((vite) => {
    app.use(vite.middlewares);
    
    // Fallback index.html for SPA router
    app.get("*", (req, res) => {
      const indexHtml = path.join(process.cwd(), "index.html");
      res.sendFile(indexHtml);
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in development on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in production on http://localhost:${PORT}`);
  });
}
