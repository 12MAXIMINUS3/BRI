-- =============================================================================
-- DEMO CONTENT
-- Sample portfolio projects and products so the site isn't empty. Every row
-- is marked is_demo = true and labelled "Demo" on the site. They are NOT real
-- work by the business. Remove them once real content is added:
--   delete from public.portfolio_projects where is_demo;
--   delete from public.products where is_demo;
-- Prices are placeholder minor units (32000 = 320.00 in the configured currency).
-- =============================================================================

with projects (slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order) as (
  values
  ('walnut-dining-table', 'Walnut dining table', 'tables'::public.product_category,
   'A solid walnut table with a softened edge profile and tapered legs, seating eight.',
   E'A long dining table in solid walnut, sized for eight. The top is edge-jointed from wide boards with the grain matched across the joints, and the edges are eased so they are comfortable to lean on.\n\nTapered legs are joined to the apron with mortise-and-tenon joints, and the top is fixed with buttons so it can move with seasonal changes in humidity.',
   array['Solid walnut'], array['Hardwax oil'], 'W 2200 × D 950 × H 750 mm', true, 1),
  ('oak-alcove-shelving', 'Oak alcove shelving', 'cabinetry',
   'Fitted shelves and low cupboards built to the exact shape of a pair of alcoves.',
   E'Built-in shelving for two alcoves either side of a fireplace. Each unit was scribed to the uneven walls so it sits tight without visible gaps.\n\nLow cupboards with flush doors sit beneath adjustable shelves, with concealed hinges and push-to-open catches.',
   array['Oak veneered board', 'Solid oak edging and face frames'], array['Clear lacquer, matte'],
   'Two units, each approx. W 1050 × D 380 × H 2400 mm', true, 2),
  ('ash-lounge-chair', 'Ash lounge chair', 'seating',
   'A low lounge chair in steam-bent ash with a woven seat.',
   'A relaxed lounge chair with a gently reclined back. The back rails are steam-bent ash, and the seat is woven in natural cord.',
   array['Solid ash', 'Natural paper cord seat'], array['Natural oil'], 'W 700 × D 780 × H 720 mm, seat height 380 mm', true, 3),
  ('teak-garden-bench', 'Teak garden bench', 'outdoor',
   'A slatted bench for outdoor use, built with weather-resistant joinery.',
   'A three-seat garden bench in teak. Slats are spaced to shed water, and all fixings are stainless steel.',
   array['Teak', 'Stainless steel fixings'], array['Exterior oil'], 'W 1500 × D 560 × H 850 mm', false, 4),
  ('cherry-bed-frame', 'Cherry bed frame', 'beds',
   'A king-size bed frame with a slatted headboard and knock-down fittings.',
   'A king-size bed in solid cherry. It comes apart with bed bolts so it can be moved through narrow stairways.',
   array['Solid cherry'], array['Natural oil'], 'Fits a king-size mattress; headboard height 1050 mm', false, 5),
  ('maple-kitchen-island', 'Maple kitchen island', 'cabinetry',
   'A freestanding island with deep drawers and a thick end-grain work surface.',
   'A kitchen island with deep drawers on soft-close runners and an end-grain maple top for food preparation.',
   array['Hard maple', 'Birch plywood carcass'], array['Food-safe oil (top)', 'Clear lacquer, satin (base)'],
   'W 1600 × D 800 × H 910 mm', false, 6),
  ('oak-media-console', 'Oak media console', 'storage',
   'A low console with sliding doors and ventilated compartments for equipment.',
   'A long, low cabinet for a living room, with sliding doors, cable routing at the back, and ventilated compartments.',
   array['Solid oak', 'Oak veneered board'], array['Hardwax oil'], null, false, 7),
  ('walnut-serving-boards', 'Walnut serving boards', 'decor',
   'A set of serving boards cut from offcuts of a larger walnut commission.',
   'Serving boards in three sizes, each with a carved handle and a food-safe oil finish.',
   array['Walnut'], array['Food-safe oil'], 'Small, medium, and large; up to 600 mm long', false, 8)
)
insert into public.portfolio_projects
  (slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order,
   status, is_demo, published_at)
select slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order,
       'published', true, now()
from projects
on conflict (slug) do nothing;

insert into public.portfolio_images (project_id, alt, tone, position)
select p.id, i.alt, i.tone::public.wood_tone, i.position
from (values
  ('walnut-dining-table', 'Walnut dining table in a bright dining room', 'walnut', 0),
  ('walnut-dining-table', 'Close-up of the walnut grain and eased edge', 'walnut', 1),
  ('walnut-dining-table', 'Detail of the tapered leg and apron joint', 'cherry', 2),
  ('oak-alcove-shelving', 'Oak shelving fitted into two alcoves', 'oak', 0),
  ('oak-alcove-shelving', 'Flush cupboard doors below the shelves', 'oak', 1),
  ('ash-lounge-chair', 'Ash lounge chair with woven seat', 'ash', 0),
  ('ash-lounge-chair', 'Steam-bent back rail detail', 'maple', 1),
  ('teak-garden-bench', 'Teak garden bench on a patio', 'teak', 0),
  ('cherry-bed-frame', 'Cherry bed frame with slatted headboard', 'cherry', 0),
  ('cherry-bed-frame', 'Headboard slat detail', 'cherry', 1),
  ('maple-kitchen-island', 'Maple kitchen island with drawers', 'maple', 0),
  ('oak-media-console', 'Low oak media console', 'oak', 0),
  ('walnut-serving-boards', 'Three walnut serving boards', 'walnut', 0)
) as i (slug, alt, tone, position)
join public.portfolio_projects p on p.slug = i.slug and p.is_demo
where not exists (select 1 from public.portfolio_images x where x.project_id = p.id);

with items (slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions, featured, sort_order, alt, tone) as (
  values
  ('oak-side-table', 'Oak side table', 'tables'::public.product_category,
   'A compact side table with a lower shelf, sized for beside a sofa or bed.',
   'A small side table in solid oak with a lower shelf. The top has a slight chamfer on the underside so it looks lighter than its thickness.',
   32000, 4, array['Solid oak'], 'Hardwax oil', 'W 450 × D 450 × H 550 mm', true, 1, 'Oak side table with lower shelf', 'oak'),
  ('walnut-wall-shelf', 'Walnut wall shelf', 'storage',
   'A floating shelf with a concealed bracket, cut from a single board.',
   'A single-board walnut shelf with a hidden steel bracket. Wall fixings suitable for masonry are included.',
   14500, 2, array['Solid walnut', 'Steel bracket'], 'Natural oil', 'W 900 × D 220 × H 40 mm', true, 2, 'Floating walnut shelf on a plain wall', 'walnut'),
  ('ash-step-stool', 'Ash step stool', 'seating',
   'A sturdy two-step stool that doubles as a plant stand or bedside perch.',
   'A two-step stool with through-tenoned steps and a hand hole for carrying.',
   18000, 0, array['Solid ash'], 'Clear lacquer, matte', 'W 420 × D 380 × H 450 mm', true, 3, 'Ash two-step stool', 'ash'),
  ('cherry-serving-tray', 'Cherry serving tray', 'decor',
   'A shallow tray with carved handles and a food-safe finish.',
   'A shallow serving tray with carved handles. Wipe clean; not dishwasher safe.',
   6500, 9, array['Solid cherry'], 'Food-safe oil', 'W 500 × D 300 × H 50 mm', false, 4, 'Cherry serving tray', 'cherry'),
  ('oak-coat-rack', 'Oak coat rack', 'storage',
   'A wall-mounted rack with five turned pegs.',
   'A wall-mounted rack with five turned oak pegs set into a solid backboard.',
   9500, 6, array['Solid oak'], 'Hardwax oil', 'W 800 × D 90 × H 120 mm', false, 5, 'Oak coat rack with five pegs', 'oak'),
  ('teak-planter-box', 'Teak planter box', 'outdoor',
   'A planter box with a removable liner and raised feet for drainage.',
   'An outdoor planter in teak with a removable liner and raised feet so water can drain freely.',
   21000, 3, array['Teak'], 'Exterior oil', 'W 600 × D 300 × H 350 mm', false, 6, 'Teak planter box', 'teak'),
  ('maple-cutting-board', 'Maple cutting board', 'decor',
   'An end-grain board that is gentle on knife edges.',
   'An end-grain cutting board in hard maple with rubber feet.',
   8500, 1, array['Hard maple'], 'Food-safe oil', 'W 450 × D 300 × H 40 mm', false, 7, 'End-grain maple cutting board', 'maple')
),
inserted as (
  insert into public.products
    (slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions,
     featured, sort_order, status, is_demo)
  select slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions,
         featured, sort_order, 'published', true
  from items
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_images (product_id, alt, tone, position)
select ins.id, items.alt, items.tone::public.wood_tone, 0
from inserted ins join items on items.slug = ins.slug;
