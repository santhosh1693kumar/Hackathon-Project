export const IATA_KNOWLEDGE_BASE = `
IATA GUIDANCE DOCUMENT FOR AIRLINES: INTERLINE CONSIDERATIONS ON BAGGAGE STANDARDS (Copyright IATA 2020)

=== SECTION 2: BAGGAGE DEFINITION ===
Types of baggage:
- Carry-on/cabin baggage: baggage carried and stowed in aircraft cabin under passenger control and custody
- Checked-in baggage: baggage for which the carrier takes custody and issues/validates/updates a baggage tag

Baggage rules can vary by: Frequent Flyer status, product/service purchased, selected route(s).
IATA's primary focus is Standards and best practices around baggage management, including tracking and tracing of mishandled bags.

=== SECTION 3: BAGGAGE MANAGEMENT CONSIDERATIONS IN INTERLINE ===
When implementing a new interline partnership, carriers should discuss and clarify:
- Baggage policies and allowance
- Baggage provision determination
- Reservations and ticketing procedures
- Excess baggage definition and limitations
- Operational handling
- Mishandled baggage
- Reporting and Settlement of bag fees collected

=== SECTION 4: BAGGAGE POLICIES AND ALLOWANCE ===
Two standard free baggage allowance concepts:
1. Weight Concept: measured by total weight (e.g. 20kg or 45lb), shown as weight amount on ticket
2. Piece Concept (PC): measured by number of pieces (shown as PC on ticket)

Some carriers combine concepts (e.g. 2 pieces not weighing more than 32KG total).
Free/discounted allowance: IATA Recommended Practice 1788 applies.
Carriers should disclose individual allowance via ATPCO.
ATPCO database has critical information about excess/oversize/overweight charges and embargoed items.

=== SECTION 5: BAGGAGE PROVISIONS ===
IATA Resolution 302 determines which rules apply in an interline journey (Most Significant Carrier - MSC concept).
US Rule: For travel to/from USA (U.S. DOT Regulation 399.87) or Canada (CTA Order 2014-A-158) - Marketing Airline on first coupon provisions apply to ALL flights.

Determining Most Significant Carrier (MSC) per IATA Resolution 302:
- TC1 (Western Hemisphere: Americas, Caribbean)
- TC2 (Europe, Middle East, Africa)
- TC3 (Asia and Asia Pacific)
MSC is the carrier on the first sector crossing between TC Areas.
Exception: TC123 - carrier on first sector crossing between TC1 and TC2.
For code-share flights: Marketing Carrier's baggage policy prevails unless Marketing Carrier publishes otherwise.

Determination of Baggage Provisions (4-step process per IATA Resolution 302):
- Step 1: If all carriers have same rules → apply same rules
- Step 2: If rules differ → apply MSC's published provisions (code-share: Marketing Carrier rule)
- Step 3: If MSC has no published rules → apply check-in carrier rules
- Step 4: If check-in carrier has no rules → apply each Operating Carrier rules sector-by-sector

Currency: Follow IATA Resolution 024a (fares/charges) and 024d (currency names, codes, rounding).

=== SECTION 6: RESERVATION AND TICKETING PROCEDURES ===
Baggage allowance in ticket: 20K, 30K, or 2PC format. No free allowance: 'NO', 'NIL', or 'XX'.
Reference: IATA Resolution 722, Chapter 18 - Baggage.
Information stored in e-ticket feeds Departure Control System (DCS) for check-in baggage acceptance.
Special Service Request (SSR) with dedicated service code for special baggage (bulky, fragile, courier, bicycles).
Reference: Recommended Practice 1790c, AIRIMP Chapter 3.21.3, RHB Chapter 15.4.

For additional baggage types: SSR XBAG in PNR for excess baggage notification.
Example: SSR XBAG CC NN/AMSGVA 0345M15NOV.5PIECES EACH30×25×15CM TOTL85KG

=== SECTION 7: EXCESS BAGGAGE ===
Electronic Miscellaneous Documents (EMDs) facilitate excess baggage processes.
EMD-A: accountable document for baggage charges; Reason For Issuance Code (RFIC) 'C' - Baggage.
Paper Excess Baggage Tickets: allowed until 31 May 2021 (for carriers without EMD capability).
Reference: THB Chapter 3.8.2, Reservation Handbook Chapter 26, AIRIMP Chapter 3.21.3.

=== SECTION 8: OPERATIONAL HANDLING ===
8.1 Checked-in baggage:
Carrier may refuse baggage if: endangers aircraft/persons/property, inadequately packed, unsuitable for air carriage, forbidden by law/regulations.
Baggage reconciliation: passenger not boarding = bag cannot be on aircraft (IATA RP 1739 - Positive Passenger Baggage Matching).
Connection = delivering carrier arrives and receiving carrier departs same day or next day within 12 hours.

8.2 Baggage Acceptance:
Originating carrier must: ensure adequate securing, issue interline baggage tag (IATA Resolution 740 & RP1740a), draw attention to destination.
Ten-digit license plate uses Baggage Tag Issuer Code (BTIC) of originating carrier.
Code-share: tag must bear operating flight designator. BTIC registered per IATA Resolution 769.

Baggage labelling points (whichever first): next stopover, confirmed/requested/listed transportation point, airport change point, final destination.
Minimum Connecting Time (MCT) must be respected.
Through check-in on separate tickets is prohibited unless specifically agreed.

8.3 Baggage Carriage:
Interline/connecting baggage should be separated from other baggage on arriving aircraft.
MITA-P Article 3.5.2: loading priority to transferring interline baggage when leaving bags behind due to payload restrictions.
Local Baggage Committee (IATA Resolution 744): establishes default minimum connecting time requirements.
Delivering airline responsible for transferring baggage to next receiving airline.

8.4 Wheelchairs and mobility aids:
Battery-powered wheelchairs (SSR WCBD, SSR WCBW) cannot be interlined per IATA Resolution 745b.

8.5 Cabin baggage (carry-on/hand baggage):
Maximum size/weight set by operating airline (includes wheels, handles, side pockets).
Accepted if: compliant with weight/size/nature policies, fits under seat or overhead compartment, suitably packed, conforms with security policies.
Restrictions: liquids/aerosols/gels, dangerous goods (check IATA DGR Manual), items needing operator consent.
Reference: IATA Recommended Practice 1749.

8.6 Baggage Messaging:
Baggage Transfer Messages (BTMs) sent after each flight per IATA Resolution 709.
IATA Resolution 753: mandatory scanning at 4 key points: check-in, transfer point, handover to downline flight, arrival.
Bar code references ten-digit bag tag number → linked in Baggage Information Messages (BIMs) per IATA RP 1745.
IATA Resolution 755: rules for re-flighting into interline carriers.

=== SECTION 9: REPORTING AND SETTLEMENT ===
Interline Baggage Proration: Straight Rate Proration (SRP) methodology under MPA-P provisions.
SRP = proportional division of through fare/excess baggage charge across entire interline journey.
EMD billings: RAM Passenger Source code 23. Paper excess baggage: RAM Source Code 25.
Invoicing: Simplified Industry Settlement (SIS). Settlement: IATA Clearing House (ICH).
RAM Chapter A2 Para 1.1.4: Issuing airline responsible for correct free baggage allowance box completion.
RAM Chapter A2 Para 1.7: Issuing airline responsible to carrying airline for full appropriate rate per Resolution 302.
Billing dispute: issuing airline may reject if difference > USD30 gross.

=== SECTION 10: MISHANDLED BAGGAGE ===
Carrier at point where baggage is missing is responsible for raising file, tracing, tracking.
Mishandled (RUSH) baggage forwarded without charge by fastest means to nearest airport.
Tracing: IATA Resolution 743, IATA RP1743a. Most airlines use SITA WorldTracer or compatible system.
RUSH tag: unique coding per IATA Resolution 740 for scanning system identification.
Battery-powered wheelchairs cannot be interlined (IATA Resolution 745b).

Claiming and Settlement:
- Legal times: Montreal Convention
- Claim-settling carrier applies its tariff/policy
- Established responsibility: responsible airline absorbs settlement
- Unestablished responsibility: shared by flown mileage
- Within 60 days: prorate request sent to other airlines
- IATA currency exchange rate on date of flight applies
- No prorating on delivery expenses
- Delivery costs rechargeable by delivering carrier (not vendor) to responsible airline

=== APPENDIX: KEY IATA RESOLUTIONS ===
- Resolution 302: Baggage Provision Selection Criteria (MSC)
- Resolution 722: Ticket/EMD General Procedures
- Resolution 740: Interline Baggage Tag Form
- Resolution 743: Found and unclaimed checked baggage
- Resolution 744: Local Baggage Committee
- Resolution 745b: Special items (battery wheelchairs)
- Resolution 753: Mandatory baggage tracking
- Resolution 754: Through Check-in profiles
- Resolution 755: Re-flighting rules
- Resolution 765: Interline Connecting Time Intervals
- Resolution 769: Baggage Tag Issuer Codes
- Resolution 780: Form of Interline Traffic Agreement
- RP 1739: Passenger/Baggage Reconciliation
- RP 1744: Local Baggage Committee Rules
- RP 1745: Baggage Information Messages
- RP 1749: Carry-on Baggage
- RP 1788: Free/Reduced Transportation
`;

export const IATA_CATEGORIES = {
  allowance: ['allowance', 'weight', 'piece', 'kg', 'free baggage', 'carry-on', 'cabin baggage', 'checked', 'entitlement'],
  excess: ['excess', 'additional bag', 'extra', 'EMD', 'overweight', 'oversize', 'XBAG', 'chargeable'],
  mishandled: ['mishandled', 'lost', 'damage', 'missing', 'RUSH', 'WorldTracer', 'delay', 'pilferage', 'tracing'],
  interline: ['interline', 'MSC', 'most significant carrier', 'resolution 302', 'code-share', 'marketing carrier', 'operating carrier', 'partnership'],
  operational: ['check-in', 'acceptance', 'carriage', 'tagging', 'scanning', 'BTM', 'MCT', 'connecting', 'transfer', 'wheelchair'],
  settlement: ['settlement', 'proration', 'billing', 'invoice', 'ICH', 'SIS', 'RAM', 'EMD billing', 'revenue'],
};

export function detectCategory(question: string): string {
  const q = question.toLowerCase();
  for (const [category, keywords] of Object.entries(IATA_CATEGORIES)) {
    if (keywords.some(k => q.includes(k))) return category;
  }
  return 'general';
}
