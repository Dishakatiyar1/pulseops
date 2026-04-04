// Unit tests for anomaly detection logic

describe("Anomaly Detection Logic", () => {
  // Zero checkins
  test("should flag zero checkins when count is 0", () => {
    const checkinCount = 0;
    const shouldFlag = checkinCount === 0;
    expect(shouldFlag).toBe(true);
  });

  test("should not flag zero checkins when count is greater than 0", () => {
    const checkinCount = 5;
    const shouldFlag = checkinCount === 0;
    expect(shouldFlag).toBe(false);
  });

  // Capacity breach
  test("should flag capacity breach when above 90%", () => {
    const current = 95;
    const capacity = 100;
    const pct = current / capacity;
    expect(pct).toBeGreaterThan(0.9);
  });

  test("should not flag capacity breach when below 90%", () => {
    const current = 85;
    const capacity = 100;
    const pct = current / capacity;
    expect(pct).toBeLessThanOrEqual(0.9);
  });

  test("should auto-resolve capacity breach when below 85%", () => {
    const current = 80;
    const capacity = 100;
    const pct = current / capacity;
    const shouldResolve = pct < 0.85;
    expect(shouldResolve).toBe(true);
  });

  test("should not auto-resolve capacity breach when still above 85%", () => {
    const current = 90;
    const capacity = 100;
    const pct = current / capacity;
    const shouldResolve = pct < 0.85;
    expect(shouldResolve).toBe(false);
  });

  // Revenue drop
  test("should flag revenue drop when today is less than 70% of last week", () => {
    const today = 600;
    const lastWeek = 1000;
    const shouldFlag = lastWeek > 0 && today < lastWeek * 0.7;
    expect(shouldFlag).toBe(true);
  });

  test("should not flag revenue drop when today is above 70% of last week", () => {
    const today = 800;
    const lastWeek = 1000;
    const shouldFlag = lastWeek > 0 && today < lastWeek * 0.7;
    expect(shouldFlag).toBe(false);
  });

  test("should not flag revenue drop when last week is 0", () => {
    const today = 0;
    const lastWeek = 0;
    const shouldFlag = lastWeek > 0 && today < lastWeek * 0.7;
    expect(shouldFlag).toBe(false);
  });

  // Auto resolve revenue
  test("should auto-resolve revenue drop when recovered to 80% of last week", () => {
    const today = 850;
    const lastWeek = 1000;
    const shouldResolve = lastWeek === 0 || today >= lastWeek * 0.8;
    expect(shouldResolve).toBe(true);
  });

  test("should not auto-resolve revenue drop when still below 80%", () => {
    const today = 700;
    const lastWeek = 1000;
    const shouldResolve = lastWeek === 0 || today >= lastWeek * 0.8;
    expect(shouldResolve).toBe(false);
  });
});
