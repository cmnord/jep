describe("landing page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("can upload a game", () => {
    cy.intercept("POST", "/upload*").as("postGame");

    cy.findByRole("button", { name: /upload/i }).click();

    // Select the hidden input inside the button.
    cy.get("input[type=file]").selectFile(
      {
        fileName: "incomplete-board.jep.json",
        contents: { name: "test board" },
      },
      { force: true }
    );

    cy.wait("@postGame").then(() => cy.findByRole("alert"));
  });
});
