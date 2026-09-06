// Add performance data to students
// Run this after importing the database: node add-performance-data.js

const students = [
  {
    id: "student_001",
    performance: {
      averageScore: 85,
      attendanceRate: 91,
      courseProgress: 50,
      lastActivityAt: 1785770580991,
      skillScores: {
        grammar: 82,
        kanji: 78,
        listening: 88,
        reading: 86,
        speaking: 80,
        vocabulary: 84
      },
      skillBreakdown: {
        grammar: {
          level: "intermediate",
          progress: 82,
          strengths: ["particle usage", "sentence structure"],
          weaknesses: ["complex conjugations", "passive forms"]
        },
        kanji: {
          level: "beginner",
          progress: 78,
          strengths: ["basic kanji recognition", "stroke order"],
          weaknesses: ["compound kanji", "kanji readings"]
        },
        listening: {
          level: "advanced",
          progress: 88,
          strengths: ["conversation comprehension", "pronunciation"],
          weaknesses: ["fast speech", "dialects"]
        },
        reading: {
          level: "intermediate",
          progress: 86,
          strengths: ["hiragana/katakana", "basic sentences"],
          weaknesses: ["kanji density", "formal writing"]
        },
        speaking: {
          level: "intermediate",
          progress: 80,
          strengths: ["basic conversation", "pronunciation"],
          weaknesses: ["fluency", "advanced vocabulary"]
        },
        vocabulary: {
          level: "intermediate",
          progress: 84,
          strengths: ["daily vocabulary", "greetings"],
          weaknesses: ["business terms", "academic words"]
        }
      },
      streakDays: 18,
      weeklyProgress: [
        {week: 1, score: 75, modulesCompleted: 2, practiceMinutes: 120},
        {week: 2, score: 78, modulesCompleted: 3, practiceMinutes: 135},
        {week: 3, score: 82, modulesCompleted: 2, practiceMinutes: 140},
        {week: 4, score: 85, modulesCompleted: 3, practiceMinutes: 150},
        {week: 5, score: 83, modulesCompleted: 2, practiceMinutes: 145},
        {week: 6, score: 87, modulesCompleted: 3, practiceMinutes: 160}
      ],
      areasOfImprovement: [
        "Focus on complex grammar conjugations",
        "Practice compound kanji characters",
        "Improve speaking fluency through conversation practice",
        "Expand business vocabulary repertoire"
      ]
    }
  },
  {
    id: "student_002",
    performance: {
      averageScore: 79,
      attendanceRate: 88,
      courseProgress: 45,
      lastActivityAt: 1785770580991,
      skillScores: {
        grammar: 76,
        kanji: 72,
        listening: 82,
        reading: 80,
        speaking: 75,
        vocabulary: 78
      },
      skillBreakdown: {
        grammar: {
          level: "intermediate",
          progress: 76,
          strengths: ["intermediate grammar", "te form"],
          weaknesses: ["keigo", "causative forms"]
        },
        kanji: {
          level: "beginner",
          progress: 72,
          strengths: ["n4 kanji recognition", "readings"],
          weaknesses: ["complex compounds", "name kanji"]
        },
        listening: {
          level: "advanced",
          progress: 82,
          strengths: ["formal speech", "news comprehension"],
          weaknesses: ["rapid conversation", "multiple speakers"]
        },
        reading: {
          level: "intermediate",
          progress: 80,
          strengths: ["n4 level texts", "news articles"],
          weaknesses: ["literary japanese", "formal documents"]
        },
        speaking: {
          level: "intermediate",
          progress: 75,
          strengths: ["formal conversation", "presentations"],
          weaknesses: ["natural flow", "colloquialisms"]
        },
        vocabulary: {
          level: "intermediate",
          progress: 78,
          strengths: ["n4 vocabulary", "compound words"],
          weaknesses: ["idioms", "formal expressions"]
        }
      },
      streakDays: 12,
      weeklyProgress: [
        {week: 1, score: 70, modulesCompleted: 2, practiceMinutes: 110},
        {week: 2, score: 74, modulesCompleted: 2, practiceMinutes: 125},
        {week: 3, score: 76, modulesCompleted: 3, practiceMinutes: 130},
        {week: 4, score: 79, modulesCompleted: 2, practiceMinutes: 140},
        {week: 5, score: 81, modulesCompleted: 3, practiceMinutes: 145}
      ],
      areasOfImprovement: [
        "Master keigo (honorific language)",
        "Practice causative and passive forms",
        "Improve speaking fluency in formal settings",
        "Learn business Japanese vocabulary"
      ]
    }
  }
];

console.log("Performance data ready for manual database update");
console.log("These are the students that need performance data:");
students.forEach(s => console.log(`- ${s.id}: ${s.performance.averageScore}% average score`));