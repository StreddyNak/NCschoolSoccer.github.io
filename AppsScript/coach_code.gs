// ===== COACH LOGIN HANDLER =====
// ID of the "NC HS Coaches" spreadsheet
const COACH_SHEET_ID = "1JN68hzT5KXn4j7pSXuIH8ST_acdtVWIpNRvMeDo7Ygc";

function doGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'coachLogin') {
    return handleCoachLogin(params.email);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", message: "Coach Portal Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.type === 'review_submission') {
      return handleReviewSubmission(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleReviewSubmission(data) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var sheet = ss.getSheetByName("Reviews");
  
  if (!sheet) {
    sheet = ss.insertSheet("Reviews");
    sheet.appendRow(["Timestamp", "Coach Email", "Date", "Opponent", "Level", "Metric 1", "Metric 2", "Metric 3", "Metric 4"]);
  }
  
  // Format ratings for row
  var r = data.ratings || {};
  // JV: Movement, Communication
  // Varsity: Movement, Control, Home AR, Away AR
  
  var m1 = r.movement || "";
  var m2 = r.communication || r.control || "";
  var m3 = r.home_ar || "";
  var m4 = r.away_ar || "";
  
  sheet.appendRow([
    new Date(),
    data.coachEmail,
    data.date,
    data.opponent,
    data.level,
    m1,
    m2,
    m3,
    m4
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}

function handleCoachLogin(email) {
  try {
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Email is required' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    email = email.toLowerCase().trim();
    
    // Open Coaches Spreadsheet
    var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
    var sheet = ss.getSheetByName("Coaches");
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Coaches tab not found' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    // Headers are seemingly fixed based on prompt: 
    // A=First Name, B=Last Name, C=Email, D=School, E=Mascot
    
    // We'll scan starting from row 1 (assuming row 0 is header)
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][2] || "").toLowerCase().trim();
      
      if (rowEmail === email) {
        var firstName = String(data[i][0] || "").trim();
        var lastName = String(data[i][1] || "").trim();
        var school = String(data[i][3] || "").trim();
        var mascot = String(data[i][4] || "").trim();
        
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          firstName: firstName,
          lastName: lastName,
          school: school,
          mascot: mascot
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Access denied: Email not found.' 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Server error: ' + e.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
