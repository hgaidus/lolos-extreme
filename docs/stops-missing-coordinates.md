# Trip stops missing map coordinates

66 stops in `stops.json` have no `lat`/`lng`, so they don't get a pin on
`/trip-stops-map`. Checked against the original Drupal database's
`location_instance` table — none of these were ever geocoded on the original
site either, so this isn't a migration bug, just stops nobody got around to
pinning. Listed here in case you want to add coordinates later.

Columns: nid, title, state, trip, slug (slug is what follows the domain,
e.g. `our-driveway` -> cross-country-trips.com/our-driveway)

| nid | Title | State | Trip | Slug |
|---|---|---|---|---|
| 85 | Our Driveway | NJ | 1998 Road Trip to Virginia and North Carolina | our-driveway |
| 119 | Normandy Farms Campground | MA | 1999 Road Trip to Boston Suburbs | normandy-farms-campground |
| 124 | Home | NJ | 1999 Road Trip to Boston Suburbs | home-3 |
| 114 | Home | NJ | 1999 Road Trip to First Landing State Park, Virginia | home-1 |
| 117 | Home | NJ | 1999 Road Trip to Niagara Falls | home-2 |
| 1929 | Holiday Park Campground | MD | 2000 Chesapeake RV Road Trip | holiday-park-campground |
| 1934 | Wye Oak State Park | MD | 2000 Chesapeake RV Road Trip | wye-oak-state-park |
| 1936 | Chesapeake Bay Maritime Museum | MD | 2000 Chesapeake RV Road Trip | chesapeake-bay-maritime-museum |
| 1941 | Annapolis | MD | 2000 Chesapeake RV Road Trip | annapolis |
| 1946 | Blackwater National Wildlife Refuge | MD | 2000 Chesapeake RV Road Trip | blackwater-national-wildlife-refuge |
| 1951 | Eastern Neck National Wildlife Refuge | MD | 2000 Chesapeake RV Road Trip | eastern-neck-national-wildlife-refuge |
| 1953 | Home | NJ | 2000 Chesapeake RV Road Trip | home-13 |
| 1722 | Home | NJ | 2000 Columbus Day in Provincetown | home-12 |
| 1716 | Home | NJ | 2000 Spring Break on Hunting Island | home-11 |
| 1986 | Flying J - Latta | SC | 2001 Spring Break on Hunting Island | flying-j-latta |
| 1988 | Hunting Island State Park | SC | 2001 Spring Break on Hunting Island | hunting-island-state-park-1 |
| 1994 | Huntington Beach State Park / Brookgreen Gardens | SC | 2001 Spring Break on Hunting Island | huntington-beach-state-park-brookgreen-gardens |
| 1999 | Home | NJ | 2001 Spring Break on Hunting Island | home-15 |
| 1967 | Lake Placid | NY | 2001 Winter Trip to Lake Placid | lake-placid |
| 1975 | Mt. Brodie Ski Area | MA | 2001 Winter Trip to Lake Placid | mt-brodie-ski-area-0 |
| 1978 | Home | NJ | 2001 Winter Trip to Lake Placid | home-14 |
| 2048 | Cape Henlopen State Park | DE | 2002 RV Trip to Delaware and Virginia Beach | cape-henlopen-state-park |
| 2049 | First Landing State Park | VA | 2002 RV Trip to Delaware and Virginia Beach | first-landing-state-park-0 |
| 2059 | Assateague Island | VA | 2002 RV Trip to Delaware and Virginia Beach | assateague-island |
| 2061 | Home | NJ | 2002 RV Trip to Delaware and Virginia Beach | home-18 |
| 2027 | Flying J - Latta | SC | 2002 Spring Break on Hunting Island | flying-j-latta-0 |
| 2029 | Hunting Island State Park | SC | 2002 Spring Break on Hunting Island | hunting-island-state-park-2 |
| 2037 | Patriots Point Naval & Maritime Museum / Fort Sumter | SC | 2002 Spring Break on Hunting Island | patriots-point-naval-maritime-museum-fort-sumter |
| 2044 | Flying J - Latta | SC | 2002 Spring Break on Hunting Island | flying-j-latta-1 |
| 2046 | Home | NJ | 2002 Spring Break on Hunting Island | home-17 |
| 2011 | Stowe | VT | 2002 Winter Trip to Stowe, Vermont | stowe |
| 2017 | Clark Art Institute / Williams College Museum of Art | MA | 2002 Winter Trip to Stowe, Vermont | clark-art-institute-williams-college-museum-art |
| 2020 | Mt. Brodie Ski Area | MA | 2002 Winter Trip to Stowe, Vermont | mt-brodie-ski-area-1 |
| 2023 | Norman Rockwell Museum | MA | 2002 Winter Trip to Stowe, Vermont | norman-rockwell-museum |
| 2025 | Home | NJ | 2002 Winter Trip to Stowe, Vermont | home-16 |
| 294 | Anchorage to Home | AK | 2006 Alaska RV Road Trip | anchorage-home |
| 2582 | Nineteen Mile Brook Trailhead | NH | 2009 White Mountains Backpacking Trip | nineteen-mile-brook-trailhead |
| 2961 | Hayward and flight Home | CA | 2012 Northern California Road Trip | hayward-and-flight-home |
| 3247 | Brother's House in Ohio | OH | 2013 Cross Country Road Trip | brothers-house-ohio |
| 3540 | Flight Home | CA | 2013 Yosemite Thanksgiving | flight-home-1 |
| 8856 | 1996 ST1100 for Sale in Santa Rosa - SOLD | CA | 2015 Solo Cross Country Motorcycle Trip | 1996-st1100-sale-santa-rosa-sold |
| 5393 | South Lake Tahoe | CA | 2016 Christmas in Tahoe | south-lake-tahoe |
| 6747 | Home | CA | 2018 Eastern Sierra with Outlaws | home-34 |
| 6878 | Home | CA | 2018 Mojave Road & Indian Wells | home-35 |
| 6374 | Suvarnabhumi Airport Hotel | Thailand | 2018 Thailand Trip | suvarnabhumi-airport-hotel |
| 6686 | Home | CA | 2018 Tuolumne Meadows | home-33 |
| 7565 | Yosemite Valley | CA | 2019 August in Yosemite Valley | yosemite-valley-4 |
| 7124 | Home | CA | 2019 Superbloom | home-37 |
| 8842 | Bishop | CA | 2020 Bishop and Death Valley | bishop-10 |
| 8843 | Death Valley | CA | 2020 Bishop and Death Valley | death-valley-0 |
| 8313 | Home | CA | 2021 Pacific Northwest - Escaping the Smoke | home-40 |
| 8746 | Bishop | CA | 2022 Bishop and Death Valley | bishop-8 |
| 8829 | Bishop | CA | 2022 Bishop and Death Valley | bishop-9 |
| 10659 | Yosemite Valley | CA | 2022 Yosemite Valley | yosemite-valley-8 |
| 9945 | Salt Point State Park | CA | 2023 Lost Coast | salt-point-state-park |
| 9956 | Sea Ranch Chapel | CA | 2023 Lost Coast | sea-ranch-chapel |
| 9961 | St. Orres | CA | 2023 Lost Coast | st-orres |
| 9962 | The Lost Coast | CA | 2023 Lost Coast | lost-coast |
| 10033 | Victoria | BC | 2023 Vancouver Island | victoria |
| 10588 | Yosemite Valley | CA | 2023 Yosemite in the Fall | yosemite-valley-7 |
| 10482 | Bishop | CA | 2024 Bishop and Death Valley | bishop-12 |
| 10517 | Death Valley National Park | CA | 2024 Bishop and Death Valley | death-valley-national-park-6 |
| 11840 | Prepping Me and the Motorhome for Burning Man | CA | 2025 Burning Man | prepping-me-and-motorhome-burning-man |
| 11854 | The Climax - The Burning of the Man | NV | 2025 Burning Man | climax-burning-man |
| 11216 | Wilderness Motorhome Rentals | New Zealand | 2025 New Zealand South Island | wilderness-motorhome-rentals |
| 12108 | Carmel and Big Sur | CA | 2026 Carmel | carmel-and-big-sur |

## Notes on patterns

- **~20 are "Home" / driveway / departure-flight stops** (NJ or CA) — these
  were likely never meaningful to pin on a map even on the original site.
- **A few are recent, real destinations worth pinning** if you want the map
  to be more complete: e.g. Yosemite Valley (appears 4 times under different
  trips — 7565, 10659, 10588 — each a separate visit), Death Valley entries,
  Bishop entries, the 2023 Lost Coast stops, Victoria BC, Carmel and Big Sur
  (12108), and the 2025 Burning Man / New Zealand stops.
