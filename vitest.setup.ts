import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView; the component calls it to keep
// the highlighted option visible, which is a no-op worth stubbing rather
// than removing from the component.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
