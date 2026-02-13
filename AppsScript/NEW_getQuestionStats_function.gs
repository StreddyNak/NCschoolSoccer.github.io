// ===== GET QUESTION STATISTICS (FILTERED BY SUPERVISOR REGION) =====
// ⭐ COMPLETELY REWRITTEN to show ALL questions, not just answered ones
function getQuestionStats(supervisorRegion) {
  try {
    // NEW APPROACH: Start with ALL questions from Quiz Questions sheet,
    // then overlay statistics from Question Results sheet
    
    if (QUIZ_SHEET_ID === "YOUR_QUIZ_SHEET_ID_HERE") {
      Logger.log("WARNING: QUIZ_SHEET_ID not configured");
      return [];
    }
    
    var quizSS = SpreadsheetApp.openById(QUIZ_SHEET_ID);
    var questionsSheet = quizSS.getSheetByName('Quiz Questions');
    
    if (!questionsSheet) {
      Logger.log("Quiz Questions sheet not found");
      return [];
    }
    
    var questionsData = questionsSheet.getDataRange().getValues();
    var allQuestions = {};
    
    // Step 1: Load ALL questions from Quiz Questions sheet
    // Column A = Quiz Name, B = Question Header, C = Question Text, D = Video URL, 
    // E-J = Options, K = Correct Answer, L = Explanation, M = Assign to Group, N = Status
    for (var i = 1; i < questionsData.length; i++) {
      var quizName = String(questionsData[i][0] || '').trim();
      var questionHeader = String(questionsData[i][1] || '').trim();
      var questionText = String(questionsData[i][2] || '').trim();
      var videoUrl = String(questionsData[i][3] || '').trim();
      var correctAnswer = String(questionsData[i][10] || '').trim();
      var assignToGroup = String(questionsData[i][12] || '').toLowerCase().trim();
      var status = String(questionsData[i][13] || 'active').toLowerCase().trim();
      
      // Skip inactive questions
      if (status !== 'active') continue;
      
      // Skip if no quiz name
      if (!quizName) continue;
      
      // Skip if neither header nor question text exists
      if (!questionHeader && !questionText) continue;
      
      // Filter by supervisor region (check assignToGroup)
      if (supervisorRegion !== "MASTER" && assignToGroup) {
        var normalizedGroup = assignToGroup.toLowerCase().trim();
        var normalizedRegion = supervisorRegion.toLowerCase().trim();
        
        if (normalizedGroup !== normalizedRegion &&
            !normalizedGroup.includes(normalizedRegion) &&
            !normalizedRegion.includes(normalizedGroup)) {
          continue;
        }
      }
      
      // Use questionText as key (or questionHeader if no text)
      var keyText = questionText || questionHeader;
      var key = quizName + "|" + keyText;
      
      // Initialize question with zero stats
      allQuestions[key] = {
        quiz: quizName,
        questionNumber: i, // Use row number as default
        questionText: questionText,
        questionHeader: questionHeader,
        videoUrl: videoUrl,
        correctAnswer: correctAnswer,
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        successRate: 0,
        wrongAnswers: {},
        studentGroups: {},
        mostCommonWrongAnswer: "",
        mostCommonWrongCount: 0
      };
    }
    
    Logger.log("Loaded " + Object.keys(allQuestions).length + " questions from Quiz Questions sheet");
    
    // Step 2: Overlay statistics from Question Results sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resultsSheet = ss.getSheetByName("Question Results");
    
    if (resultsSheet) {
      var resultsData = resultsSheet.getDataRange().getValues();
      
      if (resultsData.length > 1) {
        Logger.log("Processing " + (resultsData.length - 1) + " question result rows");
        
        for (var i = 1; i < resultsData.length; i++) {
          var row = resultsData[i];
          
          if (!row[4] || !row[5]) continue;
          
          var studentGroup = String(row[3] || "Unknown").trim();
          
          // FILTER BY SUPERVISOR REGION
          if (supervisorRegion !== "MASTER") {
            var normalizedStudentGroup = studentGroup.toLowerCase().trim();
            var normalizedSupervisorRegion = supervisorRegion.toLowerCase().trim();
            
            if (normalizedStudentGroup !== normalizedSupervisorRegion &&
                !normalizedStudentGroup.includes(normalizedSupervisorRegion) &&
                !normalizedSupervisorRegion.includes(normalizedStudentGroup)) {
              continue;
            }
          }
          
          var quizName = String(row[4]);
          var questionNum = parseInt(row[5]);
          var questionText = String(row[6]);
          var studentAnswer = String(row[7]);
          var correctAnswer = String(row[8]);
          var isCorrect = row[9] === true || String(row[9]).toLowerCase() === 'true';
          
          // Match to question from Quiz Questions sheet
          var key = quizName + "|" + questionText;
          
          if (allQuestions[key]) {
            var stat = allQuestions[key];
            
            stat.totalAttempts++;
            
            if (isCorrect) {
              stat.correctAttempts++;
            } else {
              stat.incorrectAttempts++;
              if (studentAnswer) {
                if (!stat.wrongAnswers[studentAnswer]) {
                  stat.wrongAnswers[studentAnswer] = 0;
                }
                stat.wrongAnswers[studentAnswer]++;
              }
            }
            
            if (!stat.studentGroups[studentGroup]) {
              stat.studentGroups[studentGroup] = {
                total: 0,
                correct: 0
              };
            }
            stat.studentGroups[studentGroup].total++;
            if (isCorrect) {
              stat.studentGroups[studentGroup].correct++;
            }
          }
        }
      }
    }
    
    // Step 3: Calculate success rates and format results
    var result = [];
    for (var key in allQuestions) {
      var stat = allQuestions[key];
      
      if (stat.totalAttempts > 0) {
        stat.successRate = Math.round((stat.correctAttempts / stat.totalAttempts) * 100);
        
        // Find most common wrong answer
        var maxCount = 0;
        var mostCommonWrong = "";
        for (var answer in stat.wrongAnswers) {
          if (stat.wrongAnswers[answer] > maxCount) {
            maxCount = stat.wrongAnswers[answer];
            mostCommonWrong = answer;
          }
        }
        stat.mostCommonWrongAnswer = mostCommonWrong;
        stat.mostCommonWrongCount = maxCount;
      } else {
        // No attempts yet - set defaults
        stat.successRate = 0;
        stat.mostCommonWrongAnswer = "No attempts yet";
        stat.mostCommonWrongCount = 0;
      }
      
      result.push(stat);
    }
    
    // Sort by quiz name, then question number
    result.sort(function(a, b) {
      if (a.quiz !== b.quiz) {
        return a.quiz.localeCompare(b.quiz);
      }
      return a.questionNumber - b.questionNumber;
    });
    
    Logger.log("Returning " + result.length + " question stats (including unanswered questions)");
    return result;
    
  } catch (err) {
    Logger.log("ERROR in getQuestionStats: " + err.toString());
    Logger.log("Stack: " + err.stack);
    return [];
  }
}
