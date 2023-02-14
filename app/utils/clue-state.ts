export default class ClueState {
  isAnswered: boolean;

  constructor(state?: ClueState) {
    this.isAnswered = Boolean(state?.isAnswered);
  }
}
