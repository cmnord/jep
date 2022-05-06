export default class ClueState {
  isActive: boolean;

  isAnswered: boolean;

  constructor(state?: ClueState) {
    this.isActive = Boolean(state?.isActive);
    this.isAnswered = Boolean(state?.isAnswered);
  }
}
