// Shared interfaces and types for Vietnamese Candidate Tracking & Recruitment AI Assistant

export enum CandidateStatus {
  NEW = "Mới nhận",
  CONTACTED = "Đã liên hệ",
  INTERVIEWING = "Đang phỏng vấn",
  OFFERED = "Đã mời nhận việc",
  HIRED = "Đã đi làm",
  REJECTED = "Từ chối"
}

export interface Candidate {
  id: number; // Row index in spreadsheet
  timestamp: string;
  name: string;
  contact: string;
  role: string;
  source: string;
  ctvName: string;
  status: CandidateStatus;
  notes: string;
  cvResult: string;
  interviewResult: string;
}

export interface RecruitmentGroup {
  id: number; // Row index in spreadsheet
  name: string;
  url: string;
  niche: string;
  rating: number; // 1 to 5
  notes: string;
}

export interface GeneratedPost {
  style: string;
  content: string;
}

export interface SuggestedGroupKeyword {
  keyword: string;
  explanation: string;
  category: string;
}

export interface AppConfig {
  spreadsheetId: string;
  candidatesSheetName: string;
  groupsSheetName: string;
}
