// Hardcoded sample lessons for the "Test lesson" buttons.
//
// Each loads a ready-made lesson WITHOUT any AI generation, so it costs no Claude
// credits — useful for testing the outline, subject themes, editor, Present mode
// and exports. Content only: per-slide `elements` and `imageUrl` are omitted so
// the canvas layout is rebuilt by ensureElements and the create flow still
// searches the web for GIFs/images on load. Each lesson's `subject` is set so the
// matching subject background theme auto-selects (Science / Maths / English).

import type { Lesson, Slide } from "./types";
import { cid } from "./canvas";

type SampleData = { meta: Lesson["meta"]; slides: Slide[] };

const SCIENCE: SampleData = {
  "meta": {
    "title": "Plants Make Their Own Food!",
    "subject": "Science",
    "topic": "Photosynthesis",
    "yearGroup": "Grade 3",
    "region": "United States (Common Core / State Standards)",
    "durationMinutes": 45,
    "summary": "Students learn what photosynthesis is, discover the three things plants need to survive, and explore how plants in the UAE use sunlight, water, and air to grow. Through activities, discussion, and video, they'll understand why plants are amazing and how they support all life on Earth.",
    "objectives": [
      "I can explain what photosynthesis is and why plants need it.",
      "I can identify the three things plants need to make food: sunlight, water, and air.",
      "I can describe how plants in the UAE survive in hot, dry conditions.",
      "I can explain why plants are important for life on Earth."
    ],
    "vocabulary": [
      {
        "term": "Photosynthesis",
        "definition": "The special process plants use to turn sunlight, water, and air into food that helps them grow."
      },
      {
        "term": "Chlorophyll",
        "definition": "The green colour in plants that helps them catch sunlight and turn it into food."
      },
      {
        "term": "Glucose",
        "definition": "The food that plants make during photosynthesis; it gives plants energy to grow."
      },
      {
        "term": "Carbon dioxide",
        "definition": "A gas in the air that plants take in through tiny holes in their leaves."
      },
      {
        "term": "Sunlight",
        "definition": "Energy from the sun that plants use as a power source to make their own food."
      }
    ],
    "standards": [
      "NGSS 3-LS1-1: Develop models to describe that organisms have unique and diverse life cycles but all have in common birth, growth, reproduction, and death.",
      "NGSS 3-LS4-2: Use evidence to construct an explanation for how the variations in characteristics among individuals of the same species may provide advantages in surviving, finding mates, and reproducing.",
      "CCSS.SCIENCE.3.L.1: Use information gained from illustrations and the words to demonstrate understanding of texts dealing with science."
    ]
  },
  "slides": [
    {
      "id": "sl_expmt3hj3lak",
      "layout": "title",
      "title": "Plants Make Their Own Food!",
      "subtitle": "Discover the amazing process that helps plants grow.",
      "teacherNotes": "Welcome students warmly. Show energy and enthusiasm about plants! You might hold up a potted plant and say: 'Today we're going to learn the superpower that makes plants so special.' This sets an excited, curious tone. Tell students that by the end of the lesson, they'll know exactly how plants feed themselves—and it's even more amazing than eating food from a plate. In the UAE context, you can note that we have some incredible desert plants that do this even when it's extremely hot.",
      "imagePrompt": "A vibrant potted green plant or a desert plant from the UAE (such as a date palm or desert rose) in bright sunlight, with golden rays streaming down. The plant looks healthy and alive.",
      "imageAlt": "A healthy green plant in sunlight.",
      "imageQuery": "green plant sunlight growth"
    },
    {
      "id": "sl_iulzcnvz3lak",
      "layout": "objectives",
      "title": "What Will We Learn Today?",
      "subtitle": "Your learning goals for today's lesson.",
      "bullets": [
        "I can explain what **photosynthesis** is and why plants do it.",
        "I can name the three things plants need to make food.",
        "I can describe how plants in the **UAE** stay alive in hot, dry weather.",
        "I can tell why plants are super important for all life on Earth."
      ],
      "teacherNotes": "Read each objective aloud slowly and clearly. Ask students to repeat the word 'photosynthesis' together a few times—it's a big word, so repetition helps it stick. Point out that by the end of today, they'll be plant experts! You might say: 'We're going to solve a mystery: How do plants eat?' Keep the mood positive and curious. For UAE context, mention that we'll discover how even the tough desert plants here manage to grow.",
      "imagePrompt": "A checklist or learning board with pictures of the sun, water droplet, leaves, and a happy plant, showing the main ideas students will explore.",
      "imageAlt": "Learning objectives with icons for sun, water, and plants.",
      "imageQuery": "learning objectives icons plants"
    },
    {
      "id": "sl_lreb0gce3lak",
      "layout": "content",
      "title": "Green Plants in the UAE",
      "subtitle": "How plants survive in hot, dry deserts.",
      "bullets": [
        "The UAE is very **hot** and **dry**—but plants still grow here!",
        "Date palms drink water deep under the ground through long roots.",
        "Desert rose, acacia, and ghaf trees are tough UAE plants.",
        "These plants use sunlight to make food, just like all green plants.",
        "Some UAE plants have **waxy leaves** to save water in the heat."
      ],
      "teacherNotes": "Bring the lesson to life by connecting to the students' own environment. If possible, show real images or bring in a picture of a date palm or desert rose. Explain that even though the UAE is one of the hottest places on Earth, plants here are clever—they have special tricks to survive. Talk about how date palms have very long roots that reach water deep below the sand. This helps students see that photosynthesis happens everywhere, even in tough conditions. Ask: 'Have you seen plants growing here in the UAE? What do you notice about them?' This personal connection makes science real and relevant.",
      "imagePrompt": "A beautiful UAE desert landscape with date palms, desert roses with pink flowers, and acacia trees under bright sunshine. The scene shows golden sand, blue sky, and green plants thriving in the heat.",
      "imageAlt": "Desert plants in the UAE landscape.",
      "imageQuery": "UAE desert plants date palm",
      "gifQuery": "desert landscape"
    },
    {
      "id": "sl_xkkyftl53lak",
      "layout": "content",
      "title": "The Recipe for Plant Food",
      "subtitle": "What plants need to make glucose and grow.",
      "bullets": [
        "Plants are like little **chefs**—they mix three ingredients to make food!",
        "**Sunlight** is the power source (like a light bulb turning on).",
        "**Water** travels up from the roots and into the leaves.",
        "**Carbon dioxide** is a gas in the air that leaves breathe in.",
        "When mixed together, these three things make **glucose**—plant food!"
      ],
      "teacherNotes": "Use the chef/recipe metaphor to make this concrete and fun for 8-year-olds. You might mime mixing ingredients in a bowl to make the idea even clearer. Say: 'Just like bakers follow a recipe to make bread, plants follow a recipe to make their own food.' Write or show the 'ingredients': Sunlight + Water + Carbon Dioxide = Glucose. Repeat this simple formula. Emphasise that carbon dioxide is all around us in the air (they breathe it out!), so plants are always getting at least one ingredient for free. This is a 'aha!' moment for young learners. In the UAE context, note that sunlight is plentiful here, which actually helps plants make lots of food—if they have enough water!",
      "imagePrompt": "A cheerful kitchen scene where a plant 'chef' (cartoon or illustrated plant character) is mixing three large, colourful ingredients in a big bowl: a golden sun, a blue water droplet, and a swirly cloud of air/carbon dioxide. The result is a sparkling yellow glucose 'treat'.",
      "imageAlt": "A plant mixing sunlight, water, and air like a recipe.",
      "imageQuery": "plant recipe cooking sunlight water"
    },
    {
      "id": "sl_07jeqh4o3lak",
      "layout": "vocabulary",
      "title": "Key Words for Photosynthesis",
      "subtitle": "Important words we're learning today.",
      "teacherNotes": "Display each term one at a time and pronounce it clearly. Have students repeat each word aloud—this is especially important for 'photosynthesis' and 'chlorophyll,' which are new and long. Ask: 'Where have you heard these words before?' to activate prior knowledge. If you have access to a real leaf, pass it around the classroom (or show a close-up image) and say: 'The green colour you see is chlorophyll—that's the special paint that catches sunlight!' For UAE students, you might point to the plants around the school or classroom and ask: 'Can you see the green colour in those leaves? That's chlorophyll working right now!' Make it interactive and sensory where possible. You can also explain that 'glucose' is a type of sugar—plants make their own sugar to eat, which is pretty cool.",
      "vocabulary": [
        {
          "term": "Photosynthesis",
          "definition": "The special process plants use to turn sunlight, water, and air into food that helps them grow."
        },
        {
          "term": "Chlorophyll",
          "definition": "The green colour in plants that helps them catch sunlight and turn it into food."
        },
        {
          "term": "Glucose",
          "definition": "The food that plants make during photosynthesis; it gives plants energy to grow."
        },
        {
          "term": "Carbon dioxide",
          "definition": "A gas in the air that plants take in through tiny holes in their leaves."
        },
        {
          "term": "Sunlight",
          "definition": "Energy from the sun that plants use as a power source to make their own food."
        }
      ],
      "imagePrompt": "A split-screen image: on one side, a close-up of a green leaf showing the word 'chlorophyll' with a green highlight; on the other side, the sun shining down, water droplets, and air molecules, with the word 'photosynthesis' connecting them all.",
      "imageAlt": "Vocabulary terms for photosynthesis with leaf and sun imagery.",
      "imageQuery": "chlorophyll leaf green plant"
    },
    {
      "id": "sl_4wabvcx43lak",
      "layout": "activity",
      "title": "Build a Plant: Interactive Activity",
      "subtitle": "See how plants make food by matching what they need.",
      "teacherNotes": "This is a hands-on, kinesthetic activity perfect for Grade 3. It works best if you prepare simple cards, pictures, or a chart beforehand. You can laminate cards and use sticky tape, draw a diagram on a large sheet of paper on the board, or use a digital interactive if available. The goal is for students to physically or visually match each ingredient (sunlight, water, air) to a plant and see the result (glucose/growth). Circulate around the room and ask guiding questions: 'What happens if we take away the sunlight? What if there's no water?' This helps them think deeply. For students working in pairs or small groups, they can discuss their thinking with a partner. You might extend the activity by asking: 'What would happen to a plant in a dark cupboard?' or 'Which of these three things is hardest for desert plants to find?' Celebrate their thinking and correct any misconceptions gently. In the UAE context, you could ask: 'Which ingredient do you think desert plants have plenty of? Which one is hard to find?' (Answer: lots of sunlight, but water is scarce.)",
      "activity": {
        "title": "Build a Plant: Interactive Activity",
        "instructions": "1. Show students three cards or images: Sunlight, Water, and Air (Carbon Dioxide).\n2. Explain: 'These are the ingredients plants need.'\n3. Ask students: 'Can you match each ingredient to the plant?' Point to a plant picture or a real plant.\n4. As they match each one, ask: 'What does the plant do with the sunlight? With the water? With the air?'\n5. Once all three are matched, show or point to glucose/growth: 'Sunlight + Water + Air = Food! The plant grows!'\n6. Ask: 'What if we took away one ingredient? What would happen?'\n7. Let students talk in pairs or small groups about their ideas.",
        "durationMinutes": 12,
        "grouping": "Pairs or small groups"
      },
      "imagePrompt": "Three bright cards or icons arranged around a happy, growing plant: a golden sun card on top left, a blue water droplet card on the bottom left, and a white air/cloud card on the top right. Arrows point from each ingredient toward the plant. Below the plant, a glowing yellow glucose symbol or a plant that looks bigger/healthier.",
      "imageAlt": "Interactive activity showing ingredients for photosynthesis matching to a plant.",
      "imageQuery": "plant needs sunlight water air ingredients"
    },
    {
      "id": "sl_mtdsqn1i3lak",
      "layout": "discussion",
      "title": "Why Do Plants Need Sunlight?",
      "subtitle": "Explore what happens when plants don't get sun.",
      "teacherNotes": "This discussion slide invites deeper thinking and helps students make connections to their own lives and the world. Use open-ended questions to encourage all students to share ideas—there are no 'wrong' answers in discussion, only ideas to explore. Listen actively and build on what students say. If a student says something insightful, repeat it back: 'So you're saying that without sun, the plant can't make food... that's right!' Validate their thinking. For UAE students, you might tie this to real observations: 'Have you ever noticed a plant in a shady corner? What did it look like?' This brings science into their lived experience. The teacher notes include extension questions for students who finish thinking early or need a stretch. Be prepared for creative answers—some students might say 'Plants would get sad' or 'Plants would turn white'—these are wonderful starting points for learning more.",
      "discussionQuestions": [
        "What do you think happens to a plant if it doesn't get any sunlight for a long time?",
        "Why do you think plants need sunlight so badly? What does the sun do for them?",
        "Have you seen a plant that looked pale or weak? Where was it? Do you think it got enough sunlight?",
        "If plants make their own food, do they still need us to take care of them? Why or why not?",
        "How would our world be different if plants couldn't use sunlight to make food?"
      ],
      "imagePrompt": "A sad, pale plant in a dark corner next to a happy, vibrant green plant in bright sunshine. The contrast shows clearly how sunlight affects plant health.",
      "imageAlt": "Comparison of a plant in shade versus a plant in sunlight.",
      "imageQuery": "plant sunlight comparison dark shade"
    },
    {
      "id": "sl_h95yl1133lak",
      "layout": "video",
      "title": "Plants in Action: Video",
      "subtitle": "Watch how plants use sunlight to make food and grow.",
      "body": "Play the video, then pause and ask: 'What did you see the plant doing? Where did the sunlight go? How did the plant use it?'",
      "teacherNotes": "Show a short, engaging video (3–5 minutes is ideal for Grade 3 attention spans). A good clip will show the key ideas visually: sunlight hitting leaves, water moving up roots, and plants growing. Pause the video once or twice to ask simple check-for-understanding questions: 'What colour are the leaves? Why do you think they're green?' or 'Where is the water coming from?' This keeps students engaged and helps them process what they see. After the video, ask students to draw or mime what they just saw—this reinforces the learning. In the UAE context, if you can find a video showing desert plants or plants in hot climates thriving, that's perfect. Otherwise, any clear, age-appropriate explanation of photosynthesis will work. Some students may be visual learners who finally 'get it' when they see a video, so this is a crucial moment. Keep the atmosphere calm and focused; you might dim lights slightly if video quality is good.",
      "imagePrompt": "A still from a plant growth or photosynthesis animation, showing a plant leaf with sunlight rays hitting it, and perhaps arrows showing water moving up roots and growth happening.",
      "imageAlt": "Video still showing photosynthesis in action.",
      "imageQuery": "photosynthesis animation plant growth",
      "youtube": {
        "title": "Photosynthesis for Kids",
        "searchQuery": "photosynthesis explained for kids elementary school"
      }
    },
    {
      "id": "sl_2agpomdf3lak",
      "layout": "quiz",
      "title": "Check What We Know",
      "subtitle": "Quick questions to see if you understand photosynthesis!",
      "teacherNotes": "Use these questions as a formative assessment—the goal is to see what students have understood and what needs more practice, not to grade or judge them. Read each question aloud and give students time to think (at least 5–10 seconds of quiet thinking time helps even shy students form an answer). You might ask them to show answers with hand signals (thumbs up/down, fingers 1/2/3), use mini whiteboards, or simply call on volunteers. Be encouraging: 'That's a great try!' or 'Good thinking—let's look at this together.' If many students get a question wrong, don't move on; spend a moment re-teaching that idea. If most get it right, celebrate and move to the plenary. Differentiate by asking deeper follow-up questions to early finishers: 'Why do you think that's true?' or 'What would happen if...?' This keeps all learners engaged.",
      "quiz": [
        {
          "question": "What are the three things plants need to make their own food?",
          "options": [
            "Sunlight, water, and air",
            "Sunlight, sugar, and soil",
            "Water, milk, and sunlight",
            "Air, bread, and water"
          ],
          "answer": "Sunlight, water, and air"
        },
        {
          "question": "What is the green colour in plant leaves called?",
          "options": [
            "Glucose",
            "Chlorophyll",
            "Carbon dioxide",
            "Photosynthesis"
          ],
          "answer": "Chlorophyll"
        },
        {
          "question": "What is the food that plants make called?",
          "options": [
            "Sugar",
            "Starch",
            "Glucose",
            "Bread"
          ],
          "answer": "Glucose"
        },
        {
          "question": "Which of these things do plants get from the air?",
          "options": [
            "Water",
            "Sunlight",
            "Carbon dioxide",
            "Roots"
          ],
          "answer": "Carbon dioxide"
        }
      ],
      "imagePrompt": "A bright, friendly quiz board or tablet screen with question marks, checkmarks, and simple icons representing sunlight, water, leaves, and a smiling plant.",
      "imageAlt": "Quiz or assessment image with plant icons.",
      "imageQuery": "quiz questions assessment kids"
    },
    {
      "id": "sl_794f6x453lak",
      "layout": "plenary",
      "title": "You Are a Plant Detective!",
      "subtitle": "Reflect on what you learned and how to help plants grow.",
      "bullets": [
        "**You now know** how plants make their own food using sunlight, water, and air!",
        "**You can spot** the three ingredients a plant needs to survive and thrive.",
        "**You can help plants** by giving them sun, water, and fresh air.",
        "**Plants help us** by making oxygen and food for all living things!"
      ],
      "teacherNotes": "The plenary is a moment to celebrate learning and look forward. Ask students: 'What was the most amazing thing you learned today?' or 'How will you be a plant detective at home?' This helps them own their learning and think about applying it beyond the classroom. You might set a real challenge: 'This week, find a plant at home or in school. Give it what it needs and watch it grow. Be a plant detective!' In the UAE context, this is especially meaningful—students can observe desert plants, pot herbs on a school balcony, or care for a classroom plant. Take a few moments to let students share ideas for how they'll help plants. End on a high note: 'Plants are incredible, and now you know their secret. You're all plant scientists now!' If time allows, have students draw or write about one thing they learned—this is a good exit ticket that gives you insight into understanding. Keep the mood celebratory and forward-looking.",
      "imagePrompt": "A student with a magnifying glass examining a thriving plant, with thought bubbles showing the sun, water droplet, and air/leaf icons. The student looks curious and proud. In the background, a healthy plant is growing, with roots visible underground and leaves reaching toward the sun.",
      "imageAlt": "A student detective discovering how plants grow.",
      "imageQuery": "child plant detective magnifying glass",
      "gifQuery": "plant growing"
    }
  ]
};

const MATHS: SampleData = {
  "meta": {
    "title": "Fun with Fractions",
    "subject": "Mathematics",
    "topic": "Fractions",
    "yearGroup": "Grade 3",
    "region": "United States (Common Core / State Standards)",
    "durationMinutes": 45,
    "summary": "Students discover what fractions are by sharing everyday things—like pizza and chocolate—into equal parts. They learn to read a fraction, name the numerator and denominator, and spot fractions all around them.",
    "objectives": [
      "I can explain what a fraction is.",
      "I can split a whole into equal parts.",
      "I can name the numerator and denominator of a fraction.",
      "I can find fractions in everyday life."
    ],
    "vocabulary": [
      {
        "term": "Fraction",
        "definition": "A number that shows part of a whole."
      },
      {
        "term": "Whole",
        "definition": "One complete thing before it is split up."
      },
      {
        "term": "Equal parts",
        "definition": "Pieces that are exactly the same size."
      },
      {
        "term": "Numerator",
        "definition": "The top number—how many parts we have."
      },
      {
        "term": "Denominator",
        "definition": "The bottom number—how many equal parts in all."
      }
    ],
    "standards": [
      "CCSS.MATH.CONTENT.3.NF.A.1"
    ]
  },
  "slides": [
    {
      "id": "m1",
      "layout": "title",
      "title": "Fun with Fractions",
      "subtitle": "Let's share things into equal parts!",
      "teacherNotes": "Hook the class: hold up a pretend pizza and ask how we'd share it fairly with 4 friends. Tell them today they become fraction experts.",
      "imagePrompt": "a pizza cut into equal slices, friendly cartoon style",
      "imageAlt": "A pizza cut into equal slices",
      "imageQuery": "pizza cut into equal slices",
      "gifQuery": "pizza slices"
    },
    {
      "id": "m2",
      "layout": "objectives",
      "title": "What Will We Learn Today?",
      "subtitle": "Our goals",
      "bullets": [
        "I can explain what a fraction is.",
        "I can split a whole into equal parts.",
        "I can name the numerator and denominator.",
        "I can find fractions in everyday life."
      ],
      "teacherNotes": "Read each goal aloud. Tell students you'll check these off together at the end.",
      "imageQuery": "learning goals checklist kids"
    },
    {
      "id": "m3",
      "layout": "vocabulary",
      "title": "Key Words for Fractions",
      "subtitle": "Words we'll use today",
      "vocabulary": [
        {
          "term": "Fraction",
          "definition": "A number that shows part of a whole."
        },
        {
          "term": "Whole",
          "definition": "One complete thing before it is split up."
        },
        {
          "term": "Equal parts",
          "definition": "Pieces that are exactly the same size."
        },
        {
          "term": "Numerator",
          "definition": "The top number—how many parts we have."
        },
        {
          "term": "Denominator",
          "definition": "The bottom number—how many equal parts in all."
        }
      ],
      "teacherNotes": "Have students repeat each word. Emphasise EQUAL parts—this is the big idea."
    },
    {
      "id": "m4",
      "layout": "content",
      "title": "What Is a Fraction?",
      "subtitle": "Part of a whole",
      "bullets": [
        "A **fraction** is a part of a whole thing.",
        "First we split the whole into **equal parts**.",
        "Then a fraction tells us **how many** of those parts we have.",
        "Half a sandwich is a fraction—**one half**!"
      ],
      "teacherNotes": "Use a real or drawn sandwich. Fold a paper square in half to show two equal parts.",
      "imagePrompt": "a chocolate bar being broken into equal squares",
      "imageAlt": "A chocolate bar split into equal squares",
      "imageQuery": "chocolate bar equal squares",
      "gifQuery": "chocolate bar breaking"
    },
    {
      "id": "m5",
      "layout": "content",
      "title": "Numerator and Denominator",
      "subtitle": "Top and bottom numbers",
      "bullets": [
        "A fraction has a **top** number and a **bottom** number.",
        "The **denominator** (bottom) = how many equal parts in all.",
        "The **numerator** (top) = how many parts we have.",
        "In **1/4**, the 4 is the parts in all, and the 1 is our piece."
      ],
      "teacherNotes": "Draw 1/4 big. Point to top and bottom. Trick: Denominator is Down.",
      "imagePrompt": "a diagram of the fraction one quarter with labels",
      "imageAlt": "Fraction one quarter showing numerator and denominator",
      "imageQuery": "fraction one quarter diagram"
    },
    {
      "id": "m6",
      "layout": "content",
      "title": "Equal Parts Matter",
      "subtitle": "Same size, every time",
      "bullets": [
        "Parts must be **the same size** to be a fraction.",
        "Four equal slices of pizza = **quarters**.",
        "Two big slices and two tiny slices are **not** fair—or fractions!",
        "Equal parts keep sharing **fair**."
      ],
      "teacherNotes": "Show a 'bad cut' cake with uneven slices and ask if it's fair. Connect fairness to equal parts.",
      "imageQuery": "cake cut into equal slices",
      "gifQuery": "cutting cake"
    },
    {
      "id": "m7",
      "layout": "activity",
      "title": "Pizza Fraction Fun",
      "subtitle": "Hands-on practice",
      "activity": {
        "title": "Build a Fraction Pizza",
        "instructions": "In pairs, cut a paper circle into equal parts (halves, then quarters). Colour in some slices and write the fraction you made, like 2/4. Swap with another pair and read each other's fractions.",
        "durationMinutes": 12,
        "grouping": "Pairs"
      },
      "teacherNotes": "Pre-cut circles for students who need support. Walk around and ask 'how many parts in all? how many coloured?'",
      "imageQuery": "paper plate fraction activity classroom"
    },
    {
      "id": "m8",
      "layout": "discussion",
      "title": "Fractions Around Us",
      "subtitle": "Let's talk",
      "discussionQuestions": [
        "Where have you seen something cut into equal parts?",
        "How do you share a snack fairly with a friend?",
        "Is half of a big cookie bigger than half of a small cookie?",
        "Why do the parts need to be equal?",
        "What fraction of the day do you spend at school?"
      ],
      "teacherNotes": "Encourage think-pair-share. The big-cookie question surfaces that fractions are 'part of a whole'.",
      "imageQuery": "children sharing food fairly"
    },
    {
      "id": "m9",
      "layout": "video",
      "title": "Fractions in Action",
      "subtitle": "Watch and learn",
      "body": "Let's watch a short video that shows fractions with food and shapes. Look out for the numerator and denominator!",
      "teacherNotes": "Pause the video when a fraction appears and ask the class to name the numerator and denominator.",
      "imageQuery": "fractions for kids video",
      "youtube": {
        "title": "Fractions for Kids",
        "searchQuery": "fractions for kids grade 3 numerator denominator"
      }
    },
    {
      "id": "m10",
      "layout": "quiz",
      "title": "Show What You Know",
      "subtitle": "Quick check",
      "quiz": [
        {
          "question": "What does the bottom number (denominator) tell us?",
          "options": [
            "How many equal parts are in the whole",
            "How many parts we have",
            "The biggest number",
            "Nothing important"
          ],
          "answer": "How many equal parts are in the whole"
        },
        {
          "question": "A pizza is cut into 4 equal slices and you eat 1. What fraction did you eat?",
          "options": [
            "1/4",
            "4/1",
            "1/2",
            "4/4"
          ],
          "answer": "1/4"
        },
        {
          "question": "Which one shows EQUAL parts?",
          "options": [
            "A chocolate bar split into same-size squares",
            "A cake with big and small slices",
            "A torn piece of paper",
            "A melting ice cream"
          ],
          "answer": "A chocolate bar split into same-size squares"
        }
      ],
      "teacherNotes": "Use thumbs-up/down or mini whiteboards so every child answers."
    },
    {
      "id": "m11",
      "layout": "plenary",
      "title": "You're a Fraction Master!",
      "subtitle": "Let's review",
      "bullets": [
        "A fraction is a part of a **whole**.",
        "Parts must be **equal**.",
        "The **numerator** is on top; the **denominator** is on the bottom.",
        "Fractions are everywhere—at snack time, in pizza, and in sharing!"
      ],
      "teacherNotes": "Revisit the four goals from slide 2 and tick them off together. Celebrate!",
      "imageQuery": "celebration kids math success",
      "gifQuery": "celebration confetti"
    }
  ]
};

const ENGLISH: SampleData = {
  "meta": {
    "title": "Every Story Has Parts!",
    "subject": "English / Literacy",
    "topic": "Story Elements",
    "yearGroup": "Grade 3",
    "region": "United States (Common Core / State Standards)",
    "durationMinutes": 45,
    "summary": "Students learn that every story has a beginning, middle, and end, and discover the key parts of a story—characters, setting, problem, and solution. They practise spotting these parts and map out a story of their own.",
    "objectives": [
      "I can name the beginning, middle, and end of a story.",
      "I can identify the characters and setting.",
      "I can find the problem and solution in a story.",
      "I can plan a story using its parts."
    ],
    "vocabulary": [
      {
        "term": "Character",
        "definition": "A person or animal in the story."
      },
      {
        "term": "Setting",
        "definition": "Where and when the story happens."
      },
      {
        "term": "Problem",
        "definition": "The trouble the characters must solve."
      },
      {
        "term": "Solution",
        "definition": "How the problem gets fixed."
      },
      {
        "term": "Plot",
        "definition": "The order of events: beginning, middle, end."
      }
    ],
    "standards": [
      "CCSS.ELA-LITERACY.RL.3.3"
    ]
  },
  "slides": [
    {
      "id": "e1",
      "layout": "title",
      "title": "Every Story Has Parts!",
      "subtitle": "Beginning, middle, and end",
      "teacherNotes": "Hold up a favourite picture book. Ask the class what happens first, next, and last to spark curiosity.",
      "imagePrompt": "an open storybook with sparkles, warm and inviting",
      "imageAlt": "An open storybook",
      "imageQuery": "open storybook for children",
      "gifQuery": "open book pages"
    },
    {
      "id": "e2",
      "layout": "objectives",
      "title": "What Will We Learn Today?",
      "subtitle": "Our goals",
      "bullets": [
        "I can name the beginning, middle, and end.",
        "I can identify the characters and setting.",
        "I can find the problem and solution.",
        "I can plan a story using its parts."
      ],
      "teacherNotes": "Read goals aloud. Tell students they'll plan their own mini-story by the end.",
      "imageQuery": "reading goals classroom"
    },
    {
      "id": "e3",
      "layout": "vocabulary",
      "title": "Story Words to Know",
      "subtitle": "Words we'll use today",
      "vocabulary": [
        {
          "term": "Character",
          "definition": "A person or animal in the story."
        },
        {
          "term": "Setting",
          "definition": "Where and when the story happens."
        },
        {
          "term": "Problem",
          "definition": "The trouble the characters must solve."
        },
        {
          "term": "Solution",
          "definition": "How the problem gets fixed."
        },
        {
          "term": "Plot",
          "definition": "The order of events: beginning, middle, end."
        }
      ],
      "teacherNotes": "Have students act out 'character' and 'setting' with a quick example from a known story."
    },
    {
      "id": "e4",
      "layout": "content",
      "title": "Beginning, Middle, and End",
      "subtitle": "Every story is a journey",
      "bullets": [
        "The **beginning** introduces the characters and setting.",
        "The **middle** is where the problem grows.",
        "The **end** is where the problem is solved.",
        "Together these are the **plot** of the story."
      ],
      "teacherNotes": "Map a familiar tale (e.g. The Three Little Pigs) onto beginning/middle/end on the board.",
      "imagePrompt": "a simple story road from start to finish",
      "imageAlt": "A story path showing beginning, middle, end",
      "imageQuery": "story beginning middle end chart",
      "gifQuery": "reading book"
    },
    {
      "id": "e5",
      "layout": "content",
      "title": "Characters and Setting",
      "subtitle": "Who, where, and when",
      "bullets": [
        "**Characters** are the people or animals in the story.",
        "The **setting** is where and when it happens.",
        "A setting could be a forest, a school, or outer space!",
        "Good readers picture the characters and setting in their minds."
      ],
      "teacherNotes": "Ask students to describe the setting of their favourite book in one sentence.",
      "imageQuery": "story characters and setting illustration"
    },
    {
      "id": "e6",
      "layout": "content",
      "title": "Problem and Solution",
      "subtitle": "The heart of the story",
      "bullets": [
        "The **problem** is the trouble the characters face.",
        "The **solution** is how they fix it.",
        "No problem, no story—the problem keeps us reading!",
        "Most problems are solved by the **end**."
      ],
      "teacherNotes": "Give a quick example: a lost puppy (problem) is found by a kind child (solution).",
      "imageQuery": "story problem solution kids"
    },
    {
      "id": "e7",
      "layout": "activity",
      "title": "Make a Story Map",
      "subtitle": "Plan your own story",
      "activity": {
        "title": "My Story Map",
        "instructions": "On your story map, draw and label four boxes: Characters, Setting, Problem, and Solution. Plan a short story of your own—it can be silly or serious! Share your map with a partner and tell your story out loud.",
        "durationMinutes": 12,
        "grouping": "Individual, then pairs"
      },
      "teacherNotes": "Provide a printed story-map template. Sentence starters help students who get stuck.",
      "imageQuery": "story map graphic organizer classroom"
    },
    {
      "id": "e8",
      "layout": "discussion",
      "title": "Talk About Your Favourite Stories",
      "subtitle": "Let's share",
      "discussionQuestions": [
        "Who is your favourite character, and why?",
        "What was the problem in a story you love?",
        "How was the problem solved?",
        "Can a story have more than one setting?",
        "What makes a beginning exciting?"
      ],
      "teacherNotes": "Use think-pair-share. Connect answers back to the vocabulary words.",
      "imageQuery": "children talking about books"
    },
    {
      "id": "e9",
      "layout": "video",
      "title": "Story Elements Song",
      "subtitle": "Watch and sing along",
      "body": "Let's watch a fun video about the parts of a story. Listen for the words character, setting, problem, and solution!",
      "teacherNotes": "Pause and ask students to give an example of each story element they hear.",
      "imageQuery": "story elements for kids video",
      "youtube": {
        "title": "Story Elements for Kids",
        "searchQuery": "story elements for kids characters setting problem solution"
      }
    },
    {
      "id": "e10",
      "layout": "quiz",
      "title": "Show What You Know",
      "subtitle": "Quick check",
      "quiz": [
        {
          "question": "Where do we usually meet the characters and learn the problem?",
          "options": [
            "The beginning",
            "The middle",
            "The end",
            "The cover"
          ],
          "answer": "The beginning"
        },
        {
          "question": "The WHERE and WHEN a story happens is called the…",
          "options": [
            "Setting",
            "Character",
            "Problem",
            "Title"
          ],
          "answer": "Setting"
        },
        {
          "question": "What usually happens at the END of a story?",
          "options": [
            "The problem is solved",
            "A brand-new problem starts",
            "We first meet the characters",
            "Nothing happens"
          ],
          "answer": "The problem is solved"
        }
      ],
      "teacherNotes": "Mini whiteboards or thumbs-up keep every child involved."
    },
    {
      "id": "e11",
      "layout": "plenary",
      "title": "You're a Storyteller!",
      "subtitle": "Let's review",
      "bullets": [
        "Every story has a **beginning, middle, and end**.",
        "**Characters** and **setting** tell us who, where, and when.",
        "The **problem** and **solution** are the heart of the story.",
        "Now you can plan stories of your very own!"
      ],
      "teacherNotes": "Tick off the four goals together. Invite one or two students to share their story map.",
      "imageQuery": "happy child storyteller",
      "gifQuery": "thumbs up kids"
    }
  ]
};

function make(data: SampleData): Lesson {
  return {
    id: cid("lesson"),
    kind: "lesson",
    createdAt: Date.now(),
    meta: structuredClone(data.meta),
    slides: data.slides.map((s) => ({ ...structuredClone(s), id: cid("sl") })),
  };
}

export interface TestLesson {
  id: string;
  label: string;
  make: () => Lesson;
}

export const TEST_LESSONS: TestLesson[] = [
  { id: "science", label: "Science · Photosynthesis", make: () => make(SCIENCE) },
  { id: "maths", label: "Maths · Fractions", make: () => make(MATHS) },
  { id: "english", label: "English · Story Elements", make: () => make(ENGLISH) },
];
