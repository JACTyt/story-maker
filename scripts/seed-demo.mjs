// Seeds an English demo story. Rerunnable: an existing story with the same
// title is deleted first (children go with it via ON DELETE CASCADE).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TITLE = "The Cartographer of Saltmere";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "story-maker.db");

const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });

// Drizzle's timestamp mode stores unix seconds.
const base = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
let tick = 0;
const ts = () => base + 60 * tick++;

const premise =
  "In the fog-bound fishing town of Saltmere, cartographer Wren Calloway discovers that the maps she draws " +
  "redraw themselves overnight — adding streets that drowned a century ago. As the changes spread toward the " +
  "present-day harbor, Wren must work out whether the maps are remembering the past or predicting a flood " +
  "the town has chosen to forget.";

const systemPrompt =
  "Write in close third person, past tense, following Wren. Atmospheric but restrained: concrete sensory detail " +
  "over adjectives, short paragraphs, dialogue that leaves things unsaid. Keep the magic quiet and unexplained.";

const characters = [
  {
    name: "Wren Calloway",
    appearance:
      "Early thirties, ink-stained fingertips, dark hair pinned up with a drafting pencil. Wears her late " +
      "father's oversized wool coat with a brass compass on a cord.",
    personality:
      "Precise, stubborn, distrustful of anything she cannot measure. Hides grief behind work. Dry humor; " +
      "keeps lists when she is frightened.",
  },
  {
    name: "Elias Thorne",
    appearance:
      "Sixties, weather-cut face, a white beard trimmed badly with kitchen scissors. Moves slowly and " +
      "deliberately, as if the floor might tilt.",
    personality:
      "Saltmere's last lighthouse keeper. Gentle, evasive, knows more about the Drowned Quarter than he admits. " +
      "Speaks in tide tables and weather.",
  },
  {
    name: "Mara Vey",
    appearance: "Forties, tall, oilskin jacket, a ring of keys at her belt that announces her before she arrives.",
    personality:
      "Harbormaster and de facto town council. Pragmatic, protective of Saltmere's reputation, allergic to " +
      "rumor. Sees Wren's maps as a threat to the fishing season.",
  },
  {
    name: "Tobin Ashe",
    appearance: "Twelve, all elbows, a gap in his front teeth, pockets full of sea glass.",
    personality:
      "Wren's unofficial apprentice. Curious, fearless, a terrible liar. Believes in the maps before anyone else does.",
  },
];

const places = [
  {
    name: "Calloway & Daughter, Charts and Surveys",
    description:
      "A narrow shop on Rope Street smelling of linseed and paper. Plan chests, a north-facing drafting table, " +
      "and a wall of framed coastal charts going back four generations.",
    chapter: 0,
  },
  {
    name: "Saltmere Light",
    description:
      "A whitewashed lighthouse on the breakwater, automated years ago but still tended by Elias. The lamp room " +
      "holds a logbook that records every fog since 1871.",
    chapter: 1,
  },
  {
    name: "The Drowned Quarter",
    description:
      "The old lower town, lost to the sea in the Great Surge of 1921. At the lowest spring tides, chimney " +
      "stumps and a cobbled lane surface beyond the harbor wall.",
    chapter: 2,
  },
];

const themes = [
  {
    name: "Memory versus record",
    description:
      "Maps, logbooks and town minutes claim to be objective, yet each one chooses what to leave out. What a " +
      "community forgets on purpose is still a kind of map.",
  },
  {
    name: "Inheritance and belonging",
    description:
      "Wren inherited a trade, a shop and a town's expectations. The story asks what we owe to the places that " +
      "made us — and what they owe us back.",
  },
];

const timeline = [
  { title: "The Great Surge", label: "October 1921", description: "A storm surge drowns Saltmere's lower town. The official record lists eleven dead; the lighthouse log lists forty." },
  { title: "Wren's father dies", label: "Last winter", description: "Thomas Calloway dies at his drafting table, leaving an unfinished survey of the harbor." },
  { title: "The first changed map", label: "Day 1", description: "Wren finds Bell Lane, a street of the Drowned Quarter, inked onto her new harbor chart." },
  { title: "Fog that does not lift", label: "Day 3", description: "A fog settles on Saltmere and stays. Elias begins lighting the lamp by hand." },
];

const chapters = [
  { title: "The Map That Moved", status: "generated" },
  { title: "Lantern Signals", status: "drafting" },
  { title: "The Drowned Quarter", status: "drafting" },
];

const chapterOneChat = [
  {
    role: "user",
    content:
      "Let's open the book. Chapter 1: Wren finishes a commissioned harbor chart late at night, goes to bed, and " +
      "in the morning finds a street drawn on it that she didn't draw. I want the reader to feel her disbelief " +
      "before we hint at anything supernatural.",
  },
  {
    role: "assistant",
    content:
      "Good instinct — let the strangeness arrive through her expertise. A layperson would shrug; Wren will " +
      "notice the *ink*. Some ideas:\n\n" +
      "1. **The tell is technical.** The new street is drawn in her own hand, with her habit of a double-weight " +
      "coastline — but in iron-gall ink, which she stopped using years ago. Her father used it.\n" +
      "2. **She tries to explain it away** with a checklist: sleepwalking, a prank, a smudge, a misremembered " +
      "draft. Each item gets crossed off.\n" +
      "3. **The name.** The street is labelled *Bell Lane*. She doesn't know it — yet.\n\n" +
      "Who sees the map first? Having Tobin arrive and treat it as wonderful rather than wrong would give you a " +
      "nice contrast with Wren's dread.",
  },
  {
    role: "user",
    content:
      "Yes to the iron-gall ink, that's perfect. Tobin arrives with the morning bread and is delighted. End the " +
      "chapter with Wren checking her father's old charts and finding Bell Lane on an 1890 survey.",
  },
  {
    role: "assistant",
    content:
      "That ending works: it converts \"I'm losing my mind\" into \"this street was real\", which is a scarier " +
      "question. Suggested beat sheet:\n\n" +
      "- **Night:** Wren finishes the chart for Mara Vey's harbor office; fog against the window; her father's " +
      "coat on the chair.\n" +
      "- **Morning:** the extra street. Close detail on the ink — brown-black, slightly raised, still faintly damp.\n" +
      "- **The checklist:** done in her head, quick and dry-funny.\n" +
      "- **Tobin:** bread, sea glass, \"You drew a secret street!\" He wants to go find it.\n" +
      "- **The plan chest:** the 1890 survey, the same lane, the same curve. Final line lands on the date of the " +
      "Surge pencilled in the margin.\n\n" +
      "Since the logbook will matter later, you might want someone who can read it.\n\n" +
      "[[suggest:character|Agnes Thorne|Elias's late sister, who kept the lighthouse log during the 1921 surge and recorded the true death toll]]",
  },
  {
    role: "user",
    content:
      "Love the beat sheet. Keep Mara offstage in this chapter, just mention the commission. Aim for a quiet, " +
      "eerie last line.",
  },
  {
    role: "assistant",
    content:
      "Noted — Mara stays offstage, present only as the deadline and the client. For the last line, consider " +
      "letting Wren's precision fail her for the first time: she reaches for a measurement and cannot make the " +
      "numbers agree. Something like the lane on the old survey running *exactly* where the new one does, " +
      "\"to the width of a pen nib\", with the margin note reading *Bell Lane — lost, Oct. 1921*. I'm ready " +
      "to generate the chapter whenever you are.",
  },
];

const chapterTwoChat = [
  {
    role: "user",
    content:
      "Chapter 2: Wren takes the map to Elias at the lighthouse. He recognizes Bell Lane but won't say how. " +
      "What does he give away without meaning to?",
  },
  {
    role: "assistant",
    content:
      "Have him correct her. She says the lane ran to the old chandlery; he says, too fast, \"No — to the " +
      "bell-founder's. The chandlery was on the corner.\" Only someone who walked that street would know. Then " +
      "he changes the subject to the fog, and offers to show her the lamp — which is his way of ending the conversation.",
  },
];

const chapterOneProse = `# Chapter 1: The Map That Moved

The fog came in at nine and did not leave. Wren Calloway noticed it the way she noticed most things — as a measurement. By ten it had swallowed the far side of Rope Street. By eleven the gas lamp outside the shop was a smear of yellow, the shape of a thumbprint on glass.

She worked through it. The harbor chart was due at Mara Vey's office on Friday, and Mara was not a woman who accepted weather as an excuse, least of all weather she could see from her own window.

At half past one Wren laid down her pen, flexed her cramped right hand, and looked at what she had made. The breakwater curved out like a held breath. The soundings marched in tidy columns across the channel. The coastline carried the double-weight line her father had taught her, the one that said: *here the land ends, and I am certain of it.*

His coat hung on the back of the chair. She had stopped seeing it months ago, which was how she knew it was still there.

She left the lamp burning low and went upstairs to sleep.

---

In the morning there was a street on the map.

It ran from the harbor wall, past the place where the fish market stood now, and curved south — out into the water, across thirty fathoms of soundings, as if the sea had simply been drawn over the top of it. Narrow, cobbled by the hatching. Seven buildings on either side, each a neat little rectangle. A name in her own careful capitals:

**BELL LANE**

Wren stood very still in her stockinged feet.

Then she did what she always did when the world misbehaved. She made a list.

*One. Sleepwalking.* She had never sleepwalked in her life, and the shop door was still bolted from the inside.

*Two. A prank.* By whom? Tobin couldn't draw a straight line with a ruler and a prayer, and nobody else had a key.

*Three. Misremembering.* She had drawn this chart for nine days. She knew every line on it the way she knew her own teeth.

*Four.* She bent close, close enough to smell it, and stopped making the list.

The ink was wrong.

She used carbon ink, black and flat and permanent. This was brown-black, slightly raised from the paper, with the faint reddish halo at the edges that came from iron. Iron-gall ink. She hadn't used it in eight years — not since she'd watched it eat holes in her father's oldest charts and sworn off it for good.

Her father had used nothing else.

She touched the corner of the lane with one fingertip. It came away very slightly damp.

---

The bell over the door went at seven, and Tobin Ashe came in with the bread and the cold and a pocketful of sea glass that clicked when he walked.

"Fog's so thick Mrs. Pell walked into the post box," he announced. "She said sorry to it." He set the loaf on the counter and stopped. "Wren. You drew a *secret street*."

"I didn't draw it."

"It's in your writing."

"I know it's in my writing."

He leaned over the table with his hands clasped behind his back, the way she'd taught him, so he wouldn't smudge anything. His face did something she hadn't seen in a long while — opened, like a window.

"Where does it go?"

"Nowhere. It goes into the sea."

"Then it *went* somewhere," Tobin said, as though that were obvious. "Before."

She opened her mouth to correct him and found she had nothing to correct him with.

---

The plan chests stood along the back wall, six of them, oak gone black with handling. The bottom drawer of the last one held the surveys nobody commissioned anymore — the old town, the old harbor, the coastline as it was when Calloways first started measuring it.

Wren pulled out the 1890 survey and unrolled it beside her own chart, weighting the corners with the brass shot-bags her grandfather had sewn.

It took her less than a minute to find it.

The same harbor wall. The same curve south. Seven buildings on either side. The lane on the old survey ran exactly where the new one did — she checked it with dividers, then again, then a third time, because the first two were not possible — exactly, to the width of a pen nib.

In the margin, in a hand she knew better than her own, someone had written in pencil, years after the ink had dried:

*Bell Lane — lost, Oct. 1921.*

Behind her, Tobin had gone quiet. Outside, the fog pressed its face against the window, patient, as if it were waiting to see what she would draw next.
`;

const seed = sqlite.transaction(() => {
  sqlite.prepare("DELETE FROM stories WHERE title = ?").run(TITLE);

  const story = sqlite
    .prepare(
      `INSERT INTO stories (title, premise, default_provider, default_model, ollama_host, system_prompt,
         temperature, extended_thinking, max_tokens, created_at, updated_at)
       VALUES (?, ?, 'ollama', 'qwen3.5:9b', 'http://localhost:11434', ?, 0.8, 0, 4096, ?, ?)`
    )
    .run(TITLE, premise, systemPrompt, ts(), ts());
  const storyId = Number(story.lastInsertRowid);

  const chapterIds = chapters.map((c, i) => {
    const t = ts();
    return Number(
      sqlite
        .prepare(
          `INSERT INTO chapters (story_id, title, order_index, status, created_at, updated_at)
           VALUES (?, ?, ?, 'drafting', ?, ?)`
        )
        .run(storyId, c.title, i, t, t).lastInsertRowid
    );
  });

  for (const c of characters) {
    const t = ts();
    sqlite
      .prepare(
        `INSERT INTO characters (story_id, name, appearance, personality, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(storyId, c.name, c.appearance, c.personality, t, t);
  }

  for (const p of places) {
    const t = ts();
    sqlite
      .prepare(
        `INSERT INTO places (story_id, chapter_id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(storyId, chapterIds[p.chapter], p.name, p.description, t, t);
  }

  for (const th of themes) {
    const t = ts();
    sqlite
      .prepare(`INSERT INTO themes (story_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(storyId, th.name, th.description, t, t);
  }

  timeline.forEach((e, i) => {
    const t = ts();
    sqlite
      .prepare(
        `INSERT INTO timeline_events (story_id, title, description, sort_order, in_story_date_label, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(storyId, e.title, e.description, i, e.label, t, t);
  });

  const insertMessage = sqlite.prepare(
    `INSERT INTO chat_messages (chapter_id, role, content, incomplete, created_at) VALUES (?, ?, ?, 0, ?)`
  );
  for (const m of chapterOneChat) insertMessage.run(chapterIds[0], m.role, m.content, ts());
  for (const m of chapterTwoChat) insertMessage.run(chapterIds[1], m.role, m.content, ts());

  // Mirrors recordProseVersion: version row first, then the chapter points at it.
  const versionTime = ts();
  const versionId = Number(
    sqlite
      .prepare(
        `INSERT INTO prose_versions (chapter_id, content, content_hash, source, parent_version_id, label, model, created_at)
         VALUES (?, ?, ?, 'generated', NULL, NULL, 'qwen3.5:9b', ?)`
      )
      .run(chapterIds[0], chapterOneProse, createHash("sha256").update(chapterOneProse).digest("hex"), versionTime)
      .lastInsertRowid
  );
  sqlite
    .prepare(
      `UPDATE chapters SET current_version_id = ?, generated_prose = ?, status = 'generated', updated_at = ? WHERE id = ?`
    )
    .run(versionId, chapterOneProse, versionTime, chapterIds[0]);

  return storyId;
});

const storyId = seed();
sqlite.close();
console.log(`Seeded "${TITLE}" as story ${storyId} in ${dbPath}`);
