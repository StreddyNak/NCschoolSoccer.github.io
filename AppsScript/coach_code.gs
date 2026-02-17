// ID of the "NC HS Coaches" spreadsheet
const COACH_SHEET_ID = "1JN68hzT5KXn4j7pSXuIH8ST_acdtVWIpNRvMeDo7Ygc";
const ADMIN_EMAIL = "ncschoolsoccer@gmail.com"; // Admin email for notifications

// RUN THIS FUNCTION ONCE IN THE EDITOR TO AUTHORIZE EMAIL PERMISSIONS
function authorizeEmail() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Script Authorization", "Your script can now send emails.", {name: 'NC HS Soccer Portal'});
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
    return handleDenial(params.email, params.reason);
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
    pendingSheet.appendRow([
      "First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", 
      "Film", "Platform", 
      "Home Shirt", "Home Shorts", "Home Socks", "Home GK",
      "Away Shirt", "Away Shorts", "Away Socks", "Away GK",
      "Timestamp"
    ]);
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

  // Extract specific uniform parts if available
  // Expected format if knowUniforms=Yes: "Home: Red/Red/Red (GK: Yellow)"
  // But actually, client sends "Home: shirt/shorts/socks (GK: gk)" string.
  // We should ideally change client to send specific fields, but for now let's parse or just update client to send object.
  // UPDATE: Client sends simple strings currently. We need to update client to send structured data OR parse.
  // BETTER: Let's assume we update client in next step. For now, let's just make placeholders if we can't parse easily without client update.
  // WAIT: The user asked "headers are not correct... each column should correspond to each separate type of data".
  // So I need to explode the current "Home Uniform" string into 4 columns.
  
  // Actually, I can't easily parse "Home: Red/Red/Red (GK: Yellow)" reliably without regex.
  // I will update the code to expect the client to send the separate fields, 
  // BUT first I need to update the CLIENT (coach.html) to send them.
  // Since I can only edit one file at a time or I am in the backend file now, I will update backend to EXPECT separate fields.
  
  // Columns: First, Last, Email, School, Mascot, Supervisor, Film, Platform, H-Shirt, H-Shorts, H-Socks, H-GK, A-Shirt, A-Shorts, A-Socks, A-GK, Date
  pendingSheet.appendRow([
    data.firstName,
    data.lastName,
    email,
    data.school,
    "", // Mascot
    data.supervisor || "Unknown",
    data.film || "No",
    data.platform || "",
    data.homeShirt || "",
    data.homeShorts || "",
    data.homeSocks || "",
    data.homeGK || "",
    data.awayShirt || "",
    data.awayShorts || "",
    data.awaySocks || "",
    data.awayGK || "",
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
             "Supervisor: " + (data.supervisor || "None") + "\n" +
             "Filming: " + (data.film || "No") + "\n" +
             "Platform: " + (data.platform || "N/A") + "\n" +
             "Home Uniform: " + (data.homeUniform || "N/A") + "\n" +
             "Away Uniform: " + (data.awayUniform || "N/A") + "\n\n" +
             "Approve: " + approveLink + "\n" +
             "Deny: " + denyLink;
             
  MailApp.sendEmail(ADMIN_EMAIL, subject, body, {name: 'NC HS Soccer Portal'});

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
  // Pending: First(0), Last(1), Email(2), School(3), Mascot(4), Supervisor(5), Film(6), Platform(7), 
  //          H-Shirt(8), H-Shorts(9), H-Socks(10), H-GK(11), 
  //          A-Shirt(12), A-Shorts(13), A-Socks(14), A-GK(15), Timestamp(16)
  
  var supervisor = rowData[5] || ""; 
  var film = rowData[6] || "";
  var platform = rowData[7] || "";
  
  // Uniforms
  var hShirt = rowData[8] || "";
  var hShorts = rowData[9] || "";
  var hSocks = rowData[10] || "";
  var hGK = rowData[11] || "";
  
  var aShirt = rowData[12] || "";
  var aShorts = rowData[13] || "";
  var aSocks = rowData[14] || "";
  var aGK = rowData[15] || "";
  
  // Coaches Sheet: First, Last, Email, School, Mascot, Supervisor, Film, Platform, H-Shirt, H-Shorts, H-Socks, H-GK, A-Shirt, A-Shorts, A-Socks, A-GK
  coachSheet.appendRow([
    rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], supervisor, film, platform,
    hShirt, hShorts, hSocks, hGK,
    aShirt, aShorts, aSocks, aGK
  ]);
  
  // Remove from Pending
  pendingSheet.deleteRow(rowIndex);
  
  // Email Coach
  MailApp.sendEmail(email, "Coach Portal Access Approved", "Congratulations! Your access to the NC HS Coach Portal has been approved.\n\nYou can now login at: https://ncschoolsoccer.com/coach.html", {name: 'NC HS Soccer Portal'});
  
  return HtmlService.createHtmlOutput("<h1 style='color:green'>Coach Approved and Notified!</h1><p>" + email + "</p>");
}

function handleDenial(email, reason) {
  // 1. If no reason is provided, show the input form first
  if (!reason) {
    var scriptUrl = ScriptApp.getService().getUrl();
    var html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; text-align: center; border: 1px solid #ccc; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #c0392b; margin-top: 0;">Deny Access</h2>
        <p style="color: #666;">You are denying access for:<br><strong>${email}</strong></p>
        <form action="${scriptUrl}" method="get">
          <input type="hidden" name="action" value="deny">
          <input type="hidden" name="email" value="${email}">
          <div style="margin-bottom: 20px; text-align: left;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #333;">Reason for Denial:</label>
            <textarea name="reason" rows="4" style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ddd; font-family: inherit;" required placeholder="e.g. Incomplete information, Not a recognized school..."></textarea>
          </div>
          <button type="submit" style="background: #c0392b; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 4px; cursor: pointer; width: 100%;">Confirm Denial</button>
        </form>
      </div>
    `;
    return HtmlService.createHtmlOutput(html).setTitle("Deny Access Reason");
  }

  // 2. Process the denial with the provided reason
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  var deniedSheet = ss.getSheetByName("Denied Requests");
  
  if (!deniedSheet) {
    deniedSheet = ss.insertSheet("Denied Requests");
    // Header row: First, Last, Email, School, Mascot, Supervisor, Requested Date, Denied Date, Denial Reason
    deniedSheet.appendRow(["First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", "Requested At", "Denied At", "Reason"]);
  }
  
  if (!pendingSheet) return HtmlService.createHtmlOutput("<h1>Error: Sheets not found.</h1>");
  
  var data = pendingSheet.getDataRange().getValues();
  var rowIndex = -1;
  var rowData = [];
  
  email = email.toLowerCase().trim();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || "").toLowerCase().trim() === email) {
      rowIndex = i + 1;
      rowData = data[i]; // Capture the data before deletion
      break;
    }
  }
  
  if (rowIndex === -1) {
    return HtmlService.createHtmlOutput("<h1>Request not found or already processed.</h1>");
  }

  // Archive to "Denied Requests"
  // pending: First Name(0), Last Name(1), Email(2), School(3), Mascot(4), Supervisor(5), Timestamp(6)
  deniedSheet.appendRow([
    rowData[0], 
    rowData[1], 
    rowData[2], 
    rowData[3], 
    rowData[4], 
    rowData[5], 
    rowData[6], 
    new Date(), 
    reason
  ]);
  
  // Remove from Pending
  pendingSheet.deleteRow(rowIndex);
  
  // Email Coach with Reason
  var subject = "Coach Portal Access Denied";
  var body = "Your request to access the NC HS Coach Portal has been denied.\n\nReason: " + reason;
  MailApp.sendEmail(email, subject, body, {name: 'NC HS Soccer Portal'});
  
  return HtmlService.createHtmlOutput("<h1 style='color:red'>Coach Request Denied.</h1><p>Email sent to: " + email + "</p><p>Reason: " + reason + "</p>");
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
