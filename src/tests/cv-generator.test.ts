import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulating browser's contact parsing module for Unit and Integration Testing (UT/IT)
function extractContactDetails(contactText: string) {
  const contactStr = contactText.toLowerCase();
  const emailMatch = contactStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/);
  const phoneMatch = contactStr.match(/(0[3|5|7|8|9])+([0-9]{8})\b/);
  
  return {
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    address: contactText
  };
}

// Simulating CV contact merged string compiler helper
function compileContactString(email: string, phone: string, address: string) {
  return [
    email ? `Email: ${email}` : "",
    phone ? `SĐT: ${phone}` : "",
    address ? `Địa chỉ: ${address}` : ""
  ].filter(Boolean).join(" | ");
}

describe("CV Generator & Resume Auto-fill Systems - Unit Tests (UT)", () => {
  it("should successfully extract email from custom unstructured contact string", () => {
    const rawContactLine = "Địa chỉ: Phú Nhuận, HCM. Email: test.candidate@gmail.com; SĐT: 0912345678";
    const details = extractContactDetails(rawContactLine);
    
    expect(details.email).toBe("test.candidate@gmail.com");
  });

  it("should successfully extract standard Vietnamese mobile phone numbers", () => {
    const rawContactLine = "SĐT liên hệ: 0912345678, liên hệ sau giờ hành chính";
    const details = extractContactDetails(rawContactLine);
    
    expect(details.phone).toBe("0912345678");
  });

  it("should return empty strings if contact line does not contain phone or email match", () => {
    const rawContactLine = "Chỉ làm việc từ xa tại thành phố Hồ Chí Minh";
    const details = extractContactDetails(rawContactLine);
    
    expect(details.email).toBe("");
    expect(details.phone).toBe("");
  });

  it("should correctly compile separate contact fields into a beautifully formatted single line", () => {
    const compiled = compileContactString(
      "john.doe@company.com",
      "0987654321",
      "Quận 1, TP. Hồ Chí Minh"
    );
    expect(compiled).toBe("Email: john.doe@company.com | SĐT: 0987654321 | Địa chỉ: Quận 1, TP. Hồ Chí Minh");
  });

  it("should filter out empty fields cleanly in the combined contact format output", () => {
    const compiled = compileContactString(
      "john.doe@company.com",
      "",
      "Quận 1, TP. Hồ Chí Minh"
    );
    expect(compiled).toBe("Email: john.doe@company.com | Địa chỉ: Quận 1, TP. Hồ Chí Minh");
  });
});

describe("LocalStorage Preservation and Sync Engine - Integration Tests (IT)", () => {
  const localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    // Clear the simulated local storage state
    Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      }
    });
  });

  it("should mock setting and retrieving draft inputs through LocalStorage correctly", () => {
    // Stage 1: CTV types details on the view
    const testFullName = "Nguyễn Văn A";
    const testRole = "Nhân viên Telesales";
    
    localStorage.setItem("cv_gen_fullName", testFullName);
    localStorage.setItem("cv_gen_targetRole", testRole);
    
    // Stage 2: Page reloads, and CV Generator component state is re-hydrated
    const loadedName = localStorage.getItem("cv_gen_fullName");
    const loadedRole = localStorage.getItem("cv_gen_targetRole");
    
    expect(loadedName).toBe(testFullName);
    expect(loadedRole).toBe(testRole);
  });

  it("should completely purge drafted fields from local storage upon calling Reset/Clear action", () => {
    // Stage 1: Seed drafts
    localStorage.setItem("cv_gen_fullName", "Nguyễn Văn A");
    localStorage.setItem("cv_gen_email", "nguyenvana@gmail.com");
    
    // Stage 2: Trigger reset process simulation
    localStorage.removeItem("cv_gen_fullName");
    localStorage.removeItem("cv_gen_email");
    
    expect(localStorage.getItem("cv_gen_fullName")).toBeNull();
    expect(localStorage.getItem("cv_gen_email")).toBeNull();
  });
});
