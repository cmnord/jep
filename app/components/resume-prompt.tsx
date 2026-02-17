import Button from "~/components/button";
import Dialog from "~/components/dialog";

export default function ResumePrompt({
  onResume,
  onNewGame,
}: {
  onResume: () => void;
  onNewGame: () => void;
}) {
  return (
    <Dialog
      isOpen
      title="Game in progress"
      description="You have a saved game in progress. Would you like to resume where you left off or start a new game?"
    >
      <Dialog.Footer>
        <Button onClick={onNewGame} htmlType="button">
          New Game
        </Button>
        <Button type="primary" onClick={onResume} htmlType="button" autoFocus>
          Resume Game
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
