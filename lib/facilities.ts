export interface Facility {
  state: string;
  sisterFacilityId: number;
  facility: string;       // short name used in data tables
  facNameCombined: string; // display name for sister group
}

export const FACILITIES: Facility[] = [
  // AZ
  { state: "AZ", sisterFacilityId: 70, facility: "MVC Central Phoenix",   facNameCombined: "MVC Central Phoenix / MVC North Scottsdale / MVC Peoria" },
  { state: "AZ", sisterFacilityId: 71, facility: "MVC Gilbert",           facNameCombined: "MVC Gilbert / MVC Mesa / MVC West Phoenix" },
  { state: "AZ", sisterFacilityId: 71, facility: "MVC Mesa",              facNameCombined: "MVC Gilbert / MVC Mesa / MVC West Phoenix" },
  { state: "AZ", sisterFacilityId: 70, facility: "MVC North Scottsdale",  facNameCombined: "MVC Central Phoenix / MVC North Scottsdale / MVC Peoria" },
  { state: "AZ", sisterFacilityId: 70, facility: "MVC Peoria",            facNameCombined: "MVC Central Phoenix / MVC North Scottsdale / MVC Peoria" },
  { state: "AZ", sisterFacilityId:  4, facility: "MVC Tucson",            facNameCombined: "MVC Tucson" },
  { state: "AZ", sisterFacilityId: 71, facility: "MVC West Phoenix",      facNameCombined: "MVC Gilbert / MVC Mesa / MVC West Phoenix" },
  // CT
  { state: "CT", sisterFacilityId:  5, facility: "MVC Avon",              facNameCombined: "MVC Avon / MVC Glastonbury" },
  { state: "CT", sisterFacilityId:  6, facility: "MVC Fairfield",         facNameCombined: "MVC Fairfield / MVC Hamden" },
  { state: "CT", sisterFacilityId:  5, facility: "MVC Glastonbury",       facNameCombined: "MVC Avon / MVC Glastonbury" },
  { state: "CT", sisterFacilityId:  6, facility: "MVC Hamden",            facNameCombined: "MVC Fairfield / MVC Hamden" },
  { state: "CT", sisterFacilityId:  7, facility: "MVC Stamford",          facNameCombined: "MVC Stamford / MVC Waterbury" },
  { state: "CT", sisterFacilityId:  7, facility: "MVC Waterbury",         facNameCombined: "MVC Stamford / MVC Waterbury" },
  // MI
  { state: "MI", sisterFacilityId:  8, facility: "MVC Dearborn",          facNameCombined: "MVC Dearborn / MVC Plymouth" },
  { state: "MI", sisterFacilityId:  9, facility: "MVC Grand Rapids",      facNameCombined: "MVC Grand Rapids" },
  { state: "MI", sisterFacilityId: 10, facility: "MVC Macomb",            facNameCombined: "MVC Macomb / MVC St Clair Shores" },
  { state: "MI", sisterFacilityId:  8, facility: "MVC Plymouth",          facNameCombined: "MVC Dearborn / MVC Plymouth" },
  { state: "MI", sisterFacilityId: 11, facility: "MVC Rochester",         facNameCombined: "MVC Rochester" },
  { state: "MI", sisterFacilityId: 12, facility: "MVC Royal Oak",         facNameCombined: "MVC Royal Oak / MVC West Bloomfield" },
  { state: "MI", sisterFacilityId: 10, facility: "MVC St Clair Shores",   facNameCombined: "MVC Macomb / MVC St Clair Shores" },
  { state: "MI", sisterFacilityId: 12, facility: "MVC West Bloomfield",   facNameCombined: "MVC Royal Oak / MVC West Bloomfield" },
  // NJ
  { state: "NJ", sisterFacilityId: 13, facility: "MVC Bloomfield",        facNameCombined: "MVC Bloomfield / MVC Wayne" },
  { state: "NJ", sisterFacilityId: 67, facility: "MVC Brick",             facNameCombined: "MVC Brick / MVC Marlboro" },
  { state: "NJ", sisterFacilityId: 72, facility: "MVC Edison",            facNameCombined: "MVC Edison / MVC Princeton" },
  { state: "NJ", sisterFacilityId: 16, facility: "MVC Florham Park",      facNameCombined: "MVC Florham Park / MVC Warren" },
  { state: "NJ", sisterFacilityId: 68, facility: "MVC Hackensack",        facNameCombined: "MVC Hackensack / MVC Jersey City" },
  { state: "NJ", sisterFacilityId: 68, facility: "MVC Jersey City",       facNameCombined: "MVC Hackensack / MVC Jersey City" },
  { state: "NJ", sisterFacilityId: 67, facility: "MVC Marlboro",          facNameCombined: "MVC Brick / MVC Marlboro" },
  { state: "NJ", sisterFacilityId: 20, facility: "MVC Mount Laurel",      facNameCombined: "MVC Mount Laurel / MVC Trevose" },
  { state: "NJ", sisterFacilityId: 72, facility: "MVC Princeton",         facNameCombined: "MVC Edison / MVC Princeton" },
  { state: "NJ", sisterFacilityId: 20, facility: "MVC Trevose",           facNameCombined: "MVC Mount Laurel / MVC Trevose" },
  { state: "NJ", sisterFacilityId: 22, facility: "MVC Union",             facNameCombined: "MVC Union" },
  { state: "NJ", sisterFacilityId: 16, facility: "MVC Warren",            facNameCombined: "MVC Florham Park / MVC Warren" },
  { state: "NJ", sisterFacilityId: 13, facility: "MVC Wayne",             facNameCombined: "MVC Bloomfield / MVC Wayne" },
  // NY
  { state: "NY", sisterFacilityId: 47, facility: "MVC Bronx 3rd Ave",     facNameCombined: "MVC Bronx 3rd Ave" },
  { state: "NY", sisterFacilityId: 46, facility: "MVC Bronx Morris Park", facNameCombined: "MVC Bronx Morris Park" },
  { state: "NY", sisterFacilityId: 24, facility: "MVC Brooklyn Downtown", facNameCombined: "MVC Brooklyn Downtown / MVC Williamsburg" },
  { state: "NY", sisterFacilityId: 25, facility: "MVC Brooklyn Midwood",  facNameCombined: "MVC Midwood / MVC Brooklyn Midwood / MVC Staten Island" },
  { state: "NY", sisterFacilityId: 73, facility: "MVC Buffalo",           facNameCombined: "MVC Buffalo" },
  { state: "NY", sisterFacilityId: 76, facility: "MVC Floral Park",       facNameCombined: "MVC Nassau County / MVC Floral Park" },
  { state: "NY", sisterFacilityId: 41, facility: "MVC Forest Hills",      facNameCombined: "MVC Forest Hills" },
  { state: "NY", sisterFacilityId: 74, facility: "MVC Hauppauge",         facNameCombined: "MVC Hauppauge" },
  { state: "NY", sisterFacilityId: 28, facility: "MVC Manhattan Midtown", facNameCombined: "MVC Manhattan Midtown" },
  { state: "NY", sisterFacilityId: 29, facility: "MVC Melville",          facNameCombined: "MVC Melville / MVC Port Jefferson" },
  { state: "NY", sisterFacilityId: 25, facility: "MVC Midwood",           facNameCombined: "MVC Midwood / MVC Brooklyn Midwood / MVC Staten Island" },
  { state: "NY", sisterFacilityId: 76, facility: "MVC Nassau County",     facNameCombined: "MVC Nassau County / MVC Floral Park" },
  { state: "NY", sisterFacilityId: 29, facility: "MVC Port Jefferson",    facNameCombined: "MVC Melville / MVC Port Jefferson" },
  { state: "NY", sisterFacilityId: 25, facility: "MVC Staten Island",     facNameCombined: "MVC Midwood / MVC Brooklyn Midwood / MVC Staten Island" },
  { state: "NY", sisterFacilityId: 30, facility: "MVC Westchester",       facNameCombined: "MVC Westchester / MVC Yonkers" },
  { state: "NY", sisterFacilityId: 24, facility: "MVC Williamsburg",      facNameCombined: "MVC Brooklyn Downtown / MVC Williamsburg" },
  { state: "NY", sisterFacilityId: 30, facility: "MVC Yonkers",           facNameCombined: "MVC Westchester / MVC Yonkers" },
  // TX
  { state: "TX", sisterFacilityId: 31, facility: "MVC Allen",             facNameCombined: "MVC Allen / MVC Frisco" },
  { state: "TX", sisterFacilityId: 37, facility: "MVC Arlington",         facNameCombined: "MVC Arlington" },
  { state: "TX", sisterFacilityId: 43, facility: "MVC Central Austin",    facNameCombined: "MVC Central Austin" },
  { state: "TX", sisterFacilityId: 50, facility: "MVC Clear Lake",        facNameCombined: "MVC Sugarland / MVC Clear Lake" },
  { state: "TX", sisterFacilityId: 34, facility: "MVC Coppell",           facNameCombined: "MVC Coppell / MVC Dallas White Rock / MVC White Rock" },
  { state: "TX", sisterFacilityId: 35, facility: "MVC Cypress",           facNameCombined: "MVC Cypress / MVC Woodlands" },
  { state: "TX", sisterFacilityId: 34, facility: "MVC Dallas White Rock", facNameCombined: "MVC Coppell / MVC Dallas White Rock / MVC White Rock" },
  { state: "TX", sisterFacilityId: 75, facility: "MVC Duncanville",       facNameCombined: "MVC Duncanville" },
  { state: "TX", sisterFacilityId: 32, facility: "MVC Fort Worth",        facNameCombined: "MVC Fort Worth / MVC North Fort Worth" },
  { state: "TX", sisterFacilityId: 31, facility: "MVC Frisco",            facNameCombined: "MVC Allen / MVC Frisco" },
  { state: "TX", sisterFacilityId: 69, facility: "MVC Heights",           facNameCombined: "MVC Heights" },
  { state: "TX", sisterFacilityId: 49, facility: "MVC Houston Medical Center", facNameCombined: "MVC Medical Center / MVC Houston Medical Center / MVC Katy" },
  { state: "TX", sisterFacilityId: 49, facility: "MVC Katy",              facNameCombined: "MVC Medical Center / MVC Houston Medical Center / MVC Katy" },
  { state: "TX", sisterFacilityId: 49, facility: "MVC Medical Center",    facNameCombined: "MVC Medical Center / MVC Houston Medical Center / MVC Katy" },
  { state: "TX", sisterFacilityId: 32, facility: "MVC North Fort Worth",  facNameCombined: "MVC Fort Worth / MVC North Fort Worth" },
  { state: "TX", sisterFacilityId: 66, facility: "MVC Round Rock",        facNameCombined: "MVC Round Rock" },
  { state: "TX", sisterFacilityId: 38, facility: "MVC Stone Oak",         facNameCombined: "MVC Stone Oak" },
  { state: "TX", sisterFacilityId: 50, facility: "MVC Sugarland",         facNameCombined: "MVC Sugarland / MVC Clear Lake" },
  { state: "TX", sisterFacilityId: 34, facility: "MVC White Rock",        facNameCombined: "MVC Coppell / MVC Dallas White Rock / MVC White Rock" },
  { state: "TX", sisterFacilityId: 35, facility: "MVC Woodlands",         facNameCombined: "MVC Cypress / MVC Woodlands" },
];

// Unique states in order
export const STATES = [...new Set(FACILITIES.map(f => f.state))].sort();

// Get unique sister groups per state
export function getSisterGroups(state: string) {
  const seen = new Set<number>();
  return FACILITIES
    .filter(f => f.state === state)
    .filter(f => {
      if (seen.has(f.sisterFacilityId)) return false;
      seen.add(f.sisterFacilityId);
      return true;
    })
    .map(f => ({
      sisterFacilityId: f.sisterFacilityId,
      facNameCombined: f.facNameCombined,
      facilities: FACILITIES.filter(
        x => x.state === state && x.sisterFacilityId === f.sisterFacilityId
      ),
    }));
}

// Get all sister groups company-wide
export function getAllSisterGroups() {
  const seen = new Set<number>();
  return FACILITIES
    .filter(f => {
      if (seen.has(f.sisterFacilityId)) return false;
      seen.add(f.sisterFacilityId);
      return true;
    })
    .map(f => ({
      sisterFacilityId: f.sisterFacilityId,
      state: f.state,
      facNameCombined: f.facNameCombined,
      facilities: FACILITIES.filter(x => x.sisterFacilityId === f.sisterFacilityId),
    }));
}
