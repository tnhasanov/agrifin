import "@testing-library/jest-dom/vitest";

// Testlər arasında saxlanan vəziyyət sızmasın.
beforeEach(() => {
  localStorage.clear();
});
