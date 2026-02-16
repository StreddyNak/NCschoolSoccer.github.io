// ID of the "NC HS Coaches" spreadsheet
const COACH_SHEET_ID = "1JN68hzT5KXn4j7pSXuIH8ST_acdtVWIpNRvMeDo7Ygc";
const ADMIN_EMAIL = "ncschoolsoccer@gmail.com"; // Admin email for notifications

// RUN THIS FUNCTION ONCE IN THE EDITOR TO AUTHORIZE EMAIL PERMISSIONS
function authorizeEmail() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Script Authorization", "Your script can now send emails.");
}

function doGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'coachLogin') {
    return handleCoachLogin(params.email);
  }
  
  if (action === 'approve') {
    return handleApproval(params.email);
  }
  
  if (action === 'deny') {
    return handleDenial(params.email);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", message: "Coach Portal Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ... doPost and handleReviewSubmission remain same ...
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.type === 'review_submission') {
      return handleReviewSubmission(data);
    }

    if (data.type === 'register') {
      return handleRegistration(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ... handleReviewSubmission ...
function handleReviewSubmission(data) {
  // ... (keep existing implementation)
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var sheet = ss.getSheetByName("Reviews");
  
  if (!sheet) {
    sheet = ss.insertSheet("Reviews");
    sheet.appendRow(["Timestamp", "Coach Email", "Date", "Opponent", "Level", "Metric 1", "Metric 2", "Metric 3", "Metric 4"]);
  }
  
  var r = data.ratings || {};
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
  
  // Also email admin about the new review? Optional.
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}


function handleRegistration(data) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  var coachSheet = ss.getSheetByName("Coaches");
  
  if (!pendingSheet) {
    pendingSheet = ss.insertSheet("Pending Requests");
    pendingSheet.appendRow(["First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", "Timestamp"]);
  }
  
  var email = (data.email || "").toLowerCase().trim();
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email is required" })).setMimeType(ContentService.MimeType.JSON);
  }

  // Check if already active
  var coaches = coachSheet ? coachSheet.getDataRange().getValues() : [];
  for (var i = 1; i < coaches.length; i++) {
    if (String(coaches[i][2] || "").toLowerCase().trim() === email) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email already registered. Please login." })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Check if already pending
  var pending = pendingSheet.getDataRange().getValues();
  for (var i = 1; i < pending.length; i++) {
    if (String(pending[i][2] || "").toLowerCase().trim() === email) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Request already pending approval." })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Add to Pending
  // Columns: First, Last, Email, School, Mascot, Supervisor, Date
  pendingSheet.appendRow([
    data.firstName,
    data.lastName,
    email,
    data.school,
    data.mascot,
    data.supervisor || "Unknown",
    new Date()
  ]);

  // Email Admin
  var scriptUrl = ScriptApp.getService().getUrl();
  var approveLink = scriptUrl + "?action=approve&email=" + encodeURIComponent(email);
  var denyLink = scriptUrl + "?action=deny&email=" + encodeURIComponent(email);
  
  var subject = "New Coach Access Request: " + data.firstName + " " + data.lastName;
  var body = "New request from:\n\n" +
             "Name: " + data.firstName + " " + data.lastName + "\n" +
             "Email: " + email + "\n" +
             "School: " + data.school + "\n" +
             "Mascot: " + data.mascot + "\n" +
             "Supervisor: " + (data.supervisor || "None") + "\n\n" +
             "Approve: " + approveLink + "\n" +
             "Deny: " + denyLink;
             
  MailApp.sendEmail(ADMIN_EMAIL, subject, body);

  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}

function handleApproval(email) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  var coachSheet = ss.getSheetByName("Coaches");
  
  if (!pendingSheet || !coachSheet) return HtmlService.createHtmlOutput("<h1>Error: Sheets not found.</h1>");
  
  var data = pendingSheet.getDataRange().getValues();
  var rowIndex = -1;
  var rowData = [];
  
  email = email.toLowerCase().trim();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || "").toLowerCase().trim() === email) {
      rowIndex = i + 1; // 1-based index
      rowData = data[i];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return HtmlService.createHtmlOutput("<h1>Request not found or already processed.</h1>");
  }
  
  // Move to Coaches
  // Pending: First, Last, Email, School, Mascot, Supervisor, Time
  // Coaches: First, Last, Email, School, Mascot, Supervisor
  var supervisor = rowData[5] || ""; // Get supervisor from column F
  coachSheet.appendRow([rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], supervisor]);
  
  // Remove from Pending
  pendingSheet.deleteRow(rowIndex);
  
  // Email Coach
  MailApp.sendEmail(email, "Coach Portal Access Approved", "Congratulations! Your access to the NC HS Coach Portal has been approved.\n\nYou can now login at: https://ncschoolsoccer.github.io/coach.html");
  
  return HtmlService.createHtmlOutput("<h1 style='color:green'>Coach Approved and Notified!</h1><p>" + email + "</p>");
}

function handleDenial(email) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  
  if (!pendingSheet) return HtmlService.createHtmlOutput("<h1>Error: Sheets not found.</h1>");
  
  var data = pendingSheet.getDataRange().getValues();
  var rowIndex = -1;
  
  email = email.toLowerCase().trim();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || "").toLowerCase().trim() === email) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return HtmlService.createHtmlOutput("<h1>Request not found or already processed.</h1>");
  }
  
  // Remove from Pending
  pendingSheet.deleteRow(rowIndex);
  
  // Email Coach
  MailApp.sendEmail(email, "Coach Portal Access Denied", "Your request to access the NC HS Coach Portal has been denied.");
  
  return HtmlService.createHtmlOutput("<h1 style='color:red'>Coach Request Denied.</h1><p>" + email + "</p>");
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
