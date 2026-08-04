export type LeadStatus = 
  | 'Lead'
  | 'Qualified'
  | 'Site Visit'
  | 'Negotiation'
  | 'Booking'
  | 'Agreement'
  | 'Customer'
  | 'Lost';

export class LeadStateMachine {
  // Allowed transitions
  private static transitions: Record<LeadStatus, LeadStatus[]> = {
    'Lead': ['Qualified', 'Lost'],
    'Qualified': ['Site Visit', 'Negotiation', 'Lost'],
    'Site Visit': ['Negotiation', 'Lost'],
    'Negotiation': ['Booking', 'Lost'],
    'Booking': ['Agreement', 'Lost'],
    'Agreement': ['Customer', 'Lost'],
    'Customer': [], // End state
    'Lost': ['Lead'] // Can be re-engaged
  };

  /**
   * Check if a transition is valid
   */
  static isValidTransition(currentStatus: LeadStatus, nextStatus: LeadStatus): boolean {
    if (currentStatus === nextStatus) return true; // No-op
    
    const allowed = this.transitions[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
  }

  /**
   * Transition state. Throws if invalid.
   */
  static transition(currentStatus: LeadStatus, nextStatus: LeadStatus): LeadStatus {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid state transition from ${currentStatus} to ${nextStatus}`);
    }
    return nextStatus;
  }
}
