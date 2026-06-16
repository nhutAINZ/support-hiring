import { Candidate, CandidateStatus, RecruitmentGroup } from "./types";

// Helper to construct request headers
function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 1. Fetch spreadsheet metadata to check which tabs are available
export async function fetchSpreadsheetMetadata(spreadsheetId: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, { headers: getHeaders(token) });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Không tìm thấy Google Sheet có ID: ${spreadsheetId}. Vui lòng kiểm tra lại đường dẫn.`);
    } else if (response.status === 403) {
      throw new Error("Không có quyền chỉnh sửa Sheet này. Hãy chắc chắn tài khoản Google của bạn có quyền xem & sửa.");
    } else {
      throw new Error(`Lỗi kết nối Google Sheets: ${response.statusText}`);
    }
  }
  return response.json();
}

// 2. Initialize Vietnamese recruitment tracking sheet structure if necessary
export async function initializeSheetStructure(spreadsheetId: string, token: string) {
  const metadata = await fetchSpreadsheetMetadata(spreadsheetId, token);
  const existingTitles = metadata.sheets?.map((s: any) => s.properties?.title) || [];

  const requests: any[] = [];
  const requiredSheets = [
    {
      title: "Danh Sách Ứng Viên",
      headers: [
        "Thời Gian", 
        "Họ Tên", 
        "SĐT / Liên Hệ", 
        "Vị Trí UV", 
        "Nguồn Tìm Kiếm (Group/Kênh)", 
        "Cộng Tác Viên (Bạn)", 
        "Trạng Thái Cũ", 
        "Ghi Chú Chi Tiết",
        "Trống (Cột I)",
        "Kết quả CV",
        "Trống (Cột K)",
        "Trống (Cột L)",
        "Trống (Cột M)",
        "Kết quả phỏng vấn",
        "Trống (Cột O)",
        "Trống (Cột P)",
        "Trống (Cột Q)",
        "Tình trạng ứng viên"
      ],
    },
    {
      title: "Hội Nhóm Tuyển Dụng",
      headers: ["Tên Nhóm", "Đường Dẫn GROUP", "Lĩnh Vực", "Đánh Giá (1-5 SAO)", "Ghi Chú"],
    },
  ];

  // Batch insert sheets if they are missing
  for (const sheet of requiredSheets) {
    if (!existingTitles.includes(sheet.title)) {
      requests.push({
        addSheet: {
          properties: {
            title: sheet.title,
            gridProperties: {
              rowCount: 1000,
              columnCount: sheet.title === "Danh Sách Ứng Viên" ? 24 : 15,
              frozenRowCount: 1, // Freeze the header row
            },
          },
        },
      });
    }
  }

  // Execute sheet creation
  if (requests.length > 0) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ requests }),
    });
    if (!response.ok) {
      throw new Error("Không thể khởi tạo tab dữ liệu mới trong Google Sheet.");
    }
  }

  // Now, initialize headers if any tab is empty or fresh
  for (const sheet of requiredSheets) {
    // Check if sheet already has values (at least the headers)
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheet.title)}'!A1:B1`;
    const checkRes = await fetch(checkUrl, { headers: getHeaders(token) });
    const checkData = await checkRes.json();
    
    if (!checkData.values || checkData.values.length === 0) {
      // Set the standard headers
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheet.title)}'!A1?valueInputOption=USER_ENTERED`;
      await fetch(writeUrl, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify({
          values: [sheet.headers],
        }),
      });
    }
  }
}

// 3. Fetch candidates (Danh Sách Ứng Viên)
export async function fetchCandidatesPublic(spreadsheetId: string, sheetName: string): Promise<Candidate[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) {
     throw new Error(`Không thể tải danh sách ứng viên công khai từ "${sheetName}".`);
  }

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
  if (!match) {
    throw new Error("Dữ liệu Google Sheet không đúng định dạng công khai.");
  }
  const obj = JSON.parse(match[1]);
  const table = obj.table;
  if (!table || !table.rows) {
    return [];
  }

  return table.rows.map((row: any, index: number) => {
    const sheetRowIndex = index + 2; 
    const cells = row.c || [];
    
    const getCellValue = (idx: number) => {
      if (idx >= cells.length || !cells[idx]) return "";
      const val = cells[idx].v;
      if (val === null || val === undefined) return "";
      return cells[idx].f || String(val);
    };

    const statusColR = (getCellValue(17) || "").trim();
    const statusColG = (getCellValue(6) || "").trim();
    const rawStatus = statusColR || statusColG || "";
    let parsedStatus = CandidateStatus.NEW;
    const foundStatus = Object.values(CandidateStatus).find(
      (val) => val.toLowerCase() === rawStatus.toLowerCase()
    );
    if (foundStatus) {
      parsedStatus = foundStatus;
    }

    return {
      id: sheetRowIndex,
      timestamp: getCellValue(0) || "",
      name: getCellValue(1) || "",
      contact: getCellValue(2) || "",
      role: getCellValue(3) || "",
      source: getCellValue(4) || "Facebook Group",
      ctvName: getCellValue(5) || "Sinh viên CTV",
      status: parsedStatus,
      notes: getCellValue(7) || "",
      cvResult: getCellValue(9) || "",
      interviewResult: getCellValue(13) || "",
    };
  });
}

export async function fetchCandidates(spreadsheetId: string, sheetName: string, token: string): Promise<Candidate[]> {
  const range = `'${sheetName}'!A2:R2000`; // safe limit fetching columns up to R and 2000 rows
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}`;
  const response = await fetch(url, { headers: getHeaders(token) });
  
  if (!response.ok) {
     throw new Error(`Không thể tải danh sách ứng viên từ tab "${sheetName}". Hãy kiểm tra đã chạy "Khởi tạo" chưa.`);
  }

  const data = await response.json();
  const rows = data.values || [];
  
  return rows.map((row: any[], index: number) => {
    // Row 1 is header, so row A2 is index 2 in Google Sheet
    const sheetRowIndex = index + 2; 
    let parsedStatus = CandidateStatus.NEW;
    const statusColR = (row[17] || "").trim();
    const statusColG = (row[6] || "").trim();
    const rawStatus = statusColR || statusColG || "";
    const foundStatus = Object.values(CandidateStatus).find(
      (val) => val.toLowerCase() === rawStatus.toLowerCase()
    );
    if (foundStatus) {
      parsedStatus = foundStatus;
    }

    return {
      id: sheetRowIndex,
      timestamp: row[0] || "",
      name: row[1] || "",
      contact: row[2] || "",
      role: row[3] || "",
      source: row[4] || "",
      ctvName: row[5] || "",
      status: parsedStatus,
      notes: row[7] || "",
      cvResult: row[9] || "",
      interviewResult: row[13] || "",
    };
  });
}

// 4. Add new candidate (Danh Sách Ứng Viên)
export async function addCandidate(
  spreadsheetId: string,
  sheetName: string,
  candidate: Omit<Candidate, "id" | "timestamp">,
  token: string
) {
  const range = `'${sheetName}'!A:R`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}:append?valueInputOption=USER_ENTERED`;
  
  const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const rowValues = [
    timestamp,
    candidate.name,
    candidate.contact,
    candidate.role,
    candidate.source,
    candidate.ctvName,
    candidate.status, // Old status Column G
    candidate.notes,
    "", // Column I
    candidate.cvResult || "", // Column J
    "", // Column K
    "", // Column L
    "", // Column M
    candidate.interviewResult || "", // Column N
    "", // Column O
    "", // Column P
    "", // Column Q
    candidate.status, // Column R (Tình trạng ứng viên)
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!response.ok) {
     throw new Error("Không thể thêm ứng viên mới vào Google Sheet.");
  }
}

// 5. Update Candidate Status and Details (Directly updates specific row)
export async function updateCandidate(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number, // 2-indexed map in spreadsheet
  updates: Partial<Omit<Candidate, "id" | "timestamp">>,
  token: string
) {
  // Read existing row values first to preserve fields we are not changing
  const range = `'${sheetName}'!A${rowIndex}:R${rowIndex}`;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}`;
  const getRes = await fetch(getUrl, { headers: getHeaders(token) });
  if (!getRes.ok) {
     throw new Error(`Không thể tìm thấy thông tin dòng ${rowIndex} để cập nhật.`);
  }
  const getData = await getRes.json();
  const existingRow = getData.values?.[0] || [];
  
  // Pad array to make sure it includes columns up to R (index 17)
  while (existingRow.length < 18) {
    existingRow.push("");
  }

  // Merge changes
  const timestamp = existingRow[0] || new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const name = updates.name !== undefined ? updates.name : existingRow[1];
  const contact = updates.contact !== undefined ? updates.contact : existingRow[2];
  const role = updates.role !== undefined ? updates.role : existingRow[3];
  const source = updates.source !== undefined ? updates.source : existingRow[4];
  const ctvName = updates.ctvName !== undefined ? updates.ctvName : existingRow[5];

  const currentStatusColR = (existingRow[17] || "").trim();
  const currentStatusColG = (existingRow[6] || "").trim();
  const rawCurrentStatus = currentStatusColR || currentStatusColG || "";
  let currentStatus = CandidateStatus.NEW;
  const foundStatus = Object.values(CandidateStatus).find(
    (val) => val.toLowerCase() === rawCurrentStatus.toLowerCase()
  );
  if (foundStatus) {
    currentStatus = foundStatus;
  }

  const oldStatusVal = updates.status !== undefined ? updates.status : currentStatus;
  const notes = updates.notes !== undefined ? updates.notes : existingRow[7];
  const colI = existingRow[8];
  const cvResult = updates.cvResult !== undefined ? updates.cvResult : existingRow[9];
  const colK = existingRow[10];
  const colL = existingRow[11];
  const colM = existingRow[12];
  const interviewResult = updates.interviewResult !== undefined ? updates.interviewResult : existingRow[13];
  const colO = existingRow[14];
  const colP = existingRow[15];
  const colQ = existingRow[16];
  const status = updates.status !== undefined ? updates.status : currentStatus;

  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(writeUrl, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify({
      values: [[
        timestamp, name, contact, role, source, ctvName, oldStatusVal, notes, colI,
        cvResult, colK, colL, colM, interviewResult, colO, colP, colQ, status
      ]],
    }),
  });

  if (!response.ok) {
     throw new Error(`Cập nhật dòng ${rowIndex} thất bại.`);
  }
}

// 6. Fetch Recruitment Groups (Hội Nhóm Tuyển Dụng)
export async function fetchRecruitmentGroupsPublic(spreadsheetId: string, sheetName: string): Promise<RecruitmentGroup[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) {
     throw new Error(`Không thể tải danh sách hội nhóm công khai từ "${sheetName}".`);
  }

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
  if (!match) {
    throw new Error("Dữ liệu Google Sheet không đúng định dạng công khai.");
  }
  const obj = JSON.parse(match[1]);
  const table = obj.table;
  if (!table || !table.rows) {
    return [];
  }

  return table.rows.map((row: any, index: number) => {
    const cells = row.c || [];
    
    const getCellValue = (idx: number) => {
      if (idx >= cells.length || !cells[idx]) return "";
      const val = cells[idx].v;
      if (val === null || val === undefined) return "";
      return cells[idx].f || String(val);
    };

    return {
      id: index + 2,
      name: getCellValue(0) || "",
      url: getCellValue(1) || "",
      niche: getCellValue(2) || "Sinh Viên / Part-time",
      rating: parseInt(getCellValue(3)) || 5,
      notes: getCellValue(4) || "",
    };
  });
}

export async function fetchRecruitmentGroups(spreadsheetId: string, sheetName: string, token: string): Promise<RecruitmentGroup[]> {
  const range = `'${sheetName}'!A2:E200`; // Fetch up to 200 groups
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}`;
  const response = await fetch(url, { headers: getHeaders(token) });
  
  if (!response.ok) {
     throw new Error(`Không thể tải danh sách hội nhóm tuyển dụng từ tab "${sheetName}".`);
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[], index: number) => {
    return {
      id: index + 2, // Row index in spreadsheet
      name: row[0] || "",
      url: row[1] || "",
      niche: row[2] || "",
      rating: parseInt(row[3]) || 5,
      notes: row[4] || "",
    };
  });
}

// 7. Add new recruitment group (Hội Nhóm Tuyển Dụng)
export async function addRecruitmentGroup(spreadsheetId: string, sheetName: string, group: Omit<RecruitmentGroup, "id">, token: string) {
  const range = `'${sheetName}'!A:E`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({
      values: [[group.name, group.url, group.niche, group.rating, group.notes]],
    }),
  });

  if (!response.ok) {
     throw new Error("Không thể lưu hội nhóm mới vào Google Sheets.");
  }
}
