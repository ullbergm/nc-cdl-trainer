/* The pre-trip inspection script the Pre-trip tab renders: Section 11 of the
   NC Commercial Driver Manual (the vehicle inspection test) rewritten as the
   things you say to the examiner, grouped in walk-around order. Each group
   cites the printed page its heading sits on, so the tab can deep-link into
   the PDF the way question citations do.

   A group with a `rig` key only applies to some vehicles; the `rigs` list
   names those add-ons and whether a fresh install shows them (tractor
   coupling and trailer on, to match the Class A default in exam-config.js).
   An item is { name, say: [spoken lines], note? }; a group may carry a `warn`
   the view keeps visible even when the script lines are hidden. */
const PRETRIP_SCRIPT = {
  rigs: [
    { key: 'coupling', label: 'Tractor coupling (Class A)', default: true },
    { key: 'trailer', label: 'Trailer (Class A)', default: true },
    { key: 'bus', label: 'School bus', default: false },
    { key: 'coach', label: 'Coach / transit bus', default: false },
  ],
  groups: [
    {
      name: 'Engine compartment (engine off)', page: '11-1',
      items: [
        { name: 'Leaks and hoses', say: [
          'Look for puddles on the ground.',
          'Look for fluids dripping on the underside of the engine and transmission.',
          'Inspect hoses for condition and leaks.',
        ] },
        { name: 'Oil level', say: [
          'Point out where the dipstick is located.',
          'Oil level is within the safe operating range — above the refill mark.',
        ] },
        { name: 'Coolant level', say: [
          'Inspect the reservoir sight glass, or',
          'if the engine is not hot, remove the radiator cap and check for visible coolant level.',
        ] },
        { name: 'Power steering fluid', say: [
          'Point out where the power steering fluid dipstick is located.',
          'Fluid level is adequate — above the refill mark.',
        ] },
        { name: 'Belts', say: [
          'Check the power steering belt, water pump belt, alternator belt, and air compressor belt.',
          'Each belt is snug — up to 3/4 inch of play at the center — with no cracks or frays.',
        ], note: 'If a component is not belt driven, tell the examiner, and make sure it is operating properly, not damaged or leaking, and mounted securely.' },
        { name: 'Safe start', say: [
          'Depress the clutch.',
          'Place the gearshift lever in neutral (or park, for automatics).',
          'Start the engine, then release the clutch slowly.',
        ] },
      ],
    },
    {
      name: 'Cab check / engine start', page: '11-1',
      items: [
        { name: 'Oil pressure gauge', say: [
          'The oil pressure gauge is working.',
          'Pressure shows increasing or normal oil pressure, or the warning light goes off.',
        ], note: 'If equipped, the oil temperature gauge should begin a gradual rise to the normal operating range.' },
        { name: 'Temperature gauge', say: [
          'The temperature gauge is working.',
          'Temperature begins to climb to the normal operating range, or the temperature light is off.',
        ] },
        { name: 'Air gauge', say: [
          'The air gauge is working properly.',
          'Build air pressure to governor cut-out — roughly 120–140 psi.',
        ] },
        { name: 'Ammeter / voltmeter', say: [
          'Gauges show the alternator and/or generator is charging, or the warning light is off.',
        ] },
        { name: 'Mirrors and windshield', say: [
          'Mirrors are clean and adjusted properly from the inside.',
          'Windshield is clean, with no illegal stickers, obstructions, or damage to the glass.',
        ] },
        { name: 'Emergency equipment', say: [
          'Spare electrical fuses.',
          'Three red reflective triangles, six fusees, or three liquid-burning flares.',
          'A properly charged and rated fire extinguisher.',
        ], note: 'If the vehicle is not equipped with electrical fuses, mention this to the examiner.' },
        { name: 'Wipers / washers', say: [
          'Wiper arms and blades are secure, not damaged, and operate smoothly.',
          'If equipped, windshield washers operate correctly.',
        ] },
        { name: 'Lighting indicators (dash)', say: [
          'Left turn signal.',
          'Right turn signal.',
          'Four-way emergency flashers.',
          'High beam headlight.',
          'Anti-lock Braking System (ABS) indicator.',
        ] },
        { name: 'Lights / reflectors / reflector tape', say: [
          'Clearance lights — red on the rear, amber elsewhere.',
          'Headlights, high and low beams.',
          'Taillights and backing lights.',
          'Turn signals and four-way flashers.',
          'Brake lights.',
          'Red reflectors on the rear, amber reflectors elsewhere.',
          'Reflector tape condition.',
          'All external lights and reflective equipment are clean and functional.',
        ], note: 'Checks of the brake, turn signal, and four-way flasher functions must be done separately.' },
        { name: 'Horn', say: [
          'The air horn and/or electric horn work.',
        ] },
        { name: 'Heater / defroster', say: [
          'The heater and defroster work.',
        ] },
        { name: 'Safety belt', say: [
          'The safety belt is securely mounted, adjusts, latches properly, and is not ripped or frayed.',
        ] },
      ],
    },
    {
      name: 'Brake checks', page: '11-2',
      warn: 'Failure to perform all three parts of the air brake check correctly is an automatic failure of the vehicle inspection test.',
      items: [
        { name: 'Parking brake check', say: [
          'With the parking brake engaged (trailer brakes released on a combination), gently pull forward to check the parking brake holds the vehicle.',
          'With the tractor parking brake released and the trailer parking brake engaged (combinations only), gently pull forward to check the trailer brake holds.',
        ] },
        { name: 'Hydraulic brake check', say: [
          'Pump the brake pedal three times, then hold it down for five seconds — the pedal should not move.',
          'If equipped with a hydraulic brake reserve system: key off, depress the pedal, and listen for the reserve system electric motor.',
          'The warning buzzer or light is off.',
        ] },
        { name: 'Air brake check — step 1: leak test', say: [
          'Build air pressure to governor cutoff, 120–140 psi, and shut off the engine.',
          'Chock the wheels if necessary, release the parking brake (and the tractor protection valve on a combination), and fully apply the foot brake for one minute.',
          'Air pressure should not drop more than 3 psi in one minute (single vehicle) or 4 psi (combination).',
        ] },
        { name: 'Air brake check — step 2: low-air warning', say: [
          'Without restarting the engine, turn the key to the on or battery-charge position.',
          'Fan off the air pressure by rapidly applying and releasing the foot brake.',
          'The low-air warning — buzzer, light, or flag — activates before pressure drops below 60 psi (or the manufacturer’s level).',
        ] },
        { name: 'Air brake check — step 3: emergency valves', say: [
          'Continue fanning off the air pressure.',
          'At about 40 psi on a tractor-trailer, the tractor protection valve and parking brake valve should close — pop out.',
          'On other combinations and single vehicles, the parking brake valve should pop out.',
        ] },
        { name: 'Service brake check', say: [
          'Pull forward at about 5 mph and apply the service brake.',
          'The vehicle stops and does not pull to either side.',
        ] },
      ],
    },
    {
      name: 'Steering', page: '11-3',
      items: [
        { name: 'Steering box / hoses', say: [
          'The steering box is securely mounted and not leaking; no missing nuts, bolts, or cotter keys.',
          'No power steering fluid leaks or damage to the power steering hoses.',
        ] },
        { name: 'Steering linkage', say: [
          'Connecting links, arms, and rods from the steering box to the wheel are not worn or cracked.',
          'Joints and sockets are not worn or loose; no missing nuts, bolts, or cotter keys.',
        ] },
      ],
    },
    {
      name: 'Suspension', page: '11-3',
      items: [
        { name: 'Springs / air / torque', say: [
          'No missing, shifted, cracked, or broken leaf springs.',
          'No broken or distorted coil springs.',
          'Torsion bars or torque arms, if equipped, are not damaged and are mounted securely.',
          'Air ride suspension shows no damage or leaks.',
        ] },
        { name: 'Mounts', say: [
          'No cracked or broken spring hangers; no missing or damaged bushings.',
          'No broken, loose, or missing bolts, u-bolts, or other axle mounting parts, at every point where they secure to the frame and axle.',
        ] },
        { name: 'Shock absorbers', say: [
          'Shock absorbers are secure, with no leaks.',
        ] },
      ],
      note: 'Be prepared to perform the same suspension inspection on every axle — power unit and trailer, if equipped.',
    },
    {
      name: 'Brakes (walk-around)', page: '11-3',
      items: [
        { name: 'Slack adjustors and pushrods', say: [
          'No broken, loose, or missing parts.',
          'With manual slack adjustors, the pushrod moves no more than one inch, brakes released, when pulled by hand.',
        ] },
        { name: 'Brake chambers', say: [
          'Brake chambers are not leaking, cracked, or dented, and are mounted securely.',
        ] },
        { name: 'Brake hoses / lines', say: [
          'No cracked, worn, or leaking hoses, lines, or couplings.',
        ] },
        { name: 'Drum brake', say: [
          'No cracks, dents, or holes; no loose or missing bolts.',
          'No contaminants such as debris, oil, or grease.',
          'Brake linings, where visible, are not worn dangerously thin.',
        ] },
        { name: 'Brake linings', say: [
          'On drums with openings, a visible amount of brake lining is showing.',
        ] },
      ],
      note: 'Be prepared to perform the same brake inspection on every axle — power unit and trailer, if equipped.',
    },
    {
      name: 'Wheels', page: '11-4',
      items: [
        { name: 'Rims', say: [
          'No damaged or bent rims; rims cannot have welding repairs.',
        ] },
        { name: 'Tires', say: [
          'Tread depth: at least 4/32 on steering axle tires, 2/32 on all other tires.',
          'Tread is evenly worn, with no cuts or damage to tread or sidewalls.',
          'Valve caps and stems are not missing, broken, or damaged.',
          'Proper inflation, checked with a tire gauge — no credit for kicking the tires.',
        ] },
        { name: 'Hub oil seals / axle seals', say: [
          'Hub oil and axle seals are not leaking; if the wheel has a sight glass, the oil level is adequate.',
        ] },
        { name: 'Lug nuts', say: [
          'All lug nuts are present, free of cracks and distortions, with no signs of looseness such as rust trails or shiny threads.',
          'Bolt holes are not cracked or distorted.',
        ] },
        { name: 'Spacers or Budd spacing', say: [
          'If equipped, spacers are not bent, damaged, or rusted through.',
          'Spacers are evenly centered, with the dual wheels and tires evenly separated.',
        ] },
      ],
      note: 'Be prepared to perform the same wheel inspection on every axle — power unit and trailer, if equipped.',
    },
    {
      name: 'Side of vehicle', page: '11-4',
      items: [
        { name: 'Doors / mirrors', say: [
          'Doors are not damaged and open and close properly from the outside; hinges are secure with seals intact.',
          'Mirrors and mirror brackets are not damaged and are mounted securely with no loose fittings.',
        ] },
        { name: 'Fuel tank', say: [
          'Tanks are secure, caps are tight, and there are no leaks from tanks or lines.',
        ] },
        { name: 'Drive shaft', say: [
          'The drive shaft is not bent or cracked.',
          'Couplings are secure and free of foreign objects.',
        ] },
        { name: 'Exhaust system', say: [
          'No damage or signs of leaks such as rust or carbon soot.',
          'The system is connected tightly and mounted securely.',
        ] },
        { name: 'Frame', say: [
          'No cracks, broken welds, holes, or other damage to the longitudinal frame members, cross members, box, and floor.',
        ] },
      ],
    },
    {
      name: 'Rear of vehicle', page: '11-4',
      items: [
        { name: 'Splash guards', say: [
          'If equipped, splash guards or mud flaps are not damaged and are mounted securely.',
        ] },
        { name: 'Doors / ties / lifts', say: [
          'Doors and hinges are not damaged and open, close, and latch properly from the outside.',
          'Ties, straps, chains, and binders are secure.',
          'If equipped with a cargo lift: no leaking, damaged, or missing parts; explain how to check it; the lift is fully retracted and latched securely.',
        ] },
      ],
    },
    {
      name: 'Tractor / coupling', page: '11-4', rig: 'coupling',
      items: [
        { name: 'Air / electric lines', say: [
          'Listen for air leaks.',
          'Air hoses and electrical lines are not cut, chafed, spliced, or worn — no steel braid showing through.',
          'Lines are not tangled, pinched, or dragging against tractor parts.',
        ] },
        { name: 'Catwalk / steps', say: [
          'The catwalk is solid, clear of objects, and securely bolted to the tractor frame.',
          'Steps to the cab entry and catwalk are solid, clear of objects, and securely bolted.',
        ] },
        { name: 'Mounting bolts', say: [
          'No loose or missing mounting brackets, clamps, bolts, or nuts.',
          'Both the fifth wheel and the slide mounting are solidly attached.',
        ] },
        { name: 'Hitch release lever', say: [
          'The hitch release lever is in place and secure.',
        ] },
        { name: 'Locking jaws', say: [
          'Look into the fifth wheel gap: the locking jaws are fully closed around the kingpin.',
        ] },
        { name: 'Fifth wheel skid plate', say: [
          'Properly lubricated and securely mounted to the platform, with all bolts and pins secure and none missing.',
        ] },
        { name: 'Platform', say: [
          'No cracks or breaks in the platform structure supporting the fifth wheel skid plate.',
        ] },
        { name: 'Release arm', say: [
          'If equipped, the release arm is in the engaged position and the safety latch is in place.',
        ] },
        { name: 'Kingpin / apron / gap', say: [
          'The kingpin is not bent.',
          'The visible part of the apron is not bent, cracked, or broken.',
          'The trailer lies flat on the fifth wheel skid plate — no gap.',
        ] },
        { name: 'Locking pins', say: [
          'If equipped, no loose or missing pins in the sliding fifth wheel slide mechanism; if air powered, no leaks.',
          'Locking pins are fully engaged, and the fifth wheel is positioned so the tractor frame clears the landing gear during turns.',
        ] },
      ],
      note: 'On other coupling systems (ball hitch, pintle hook), inspect all coupling components, mounting brackets, and the locking mechanism for missing or broken parts, and check that safety cables or chains are secure, free of kinks and excessive slack.',
    },
    {
      name: 'Trailer', page: '11-6', rig: 'trailer',
      items: [
        { name: 'Air / electrical connections', say: [
          'Trailer air connectors are sealed and in good condition.',
          'Glad hands are locked in place, free of damage or air leaks.',
          'The trailer electrical plug is firmly seated and locked in place.',
        ] },
        { name: 'Header board', say: [
          'If equipped, the header board is secure, free of damage, and strong enough to contain cargo.',
          'On enclosed trailers, the front area shows no cracks, bulges, or holes.',
        ] },
        { name: 'Landing gear', say: [
          'The landing gear is fully raised, with no missing parts, the crank handle secure, and the support frame not damaged.',
          'If power operated, no air or hydraulic leaks.',
        ] },
        { name: 'Doors / ties / lifts', say: [
          'Doors are not damaged and open, close, and latch properly from the outside.',
          'Ties, straps, chains, and binders are secure.',
        ] },
        { name: 'Frame', say: [
          'No cracks, broken welds, holes, or other damage to the frame, cross members, box, and floor.',
        ] },
        { name: 'Tandem release arm / locking pins', say: [
          'If equipped, the locking pins are locked in place and the release arm is secured.',
        ] },
      ],
      note: 'The remainder of the trailer — wheels, suspension, brakes, doors/ties/lifts, splash guards — is inspected the same way as the walk-around groups above, on every trailer axle.',
    },
    {
      name: 'School bus extras', page: '11-5', rig: 'bus',
      items: [
        { name: 'Emergency equipment', say: [
          'Beyond fuses, triangles, and the fire extinguisher: an emergency kit and a body fluid cleanup kit.',
        ] },
        { name: 'Lighting indicators (internal panel)', say: [
          'Alternately flashing amber lights indicator, if equipped.',
          'Alternately flashing red lights indicator.',
          'Strobe light indicator, if equipped.',
        ] },
        { name: 'Lights / reflectors (external)', say: [
          'Strobe light and stop arm light, if equipped.',
          'Alternately flashing amber lights, if equipped, and alternately flashing red lights.',
        ] },
        { name: 'Student mirrors', say: [
          'Internal and external student mirrors are properly adjusted.',
          'Mirrors and brackets are not damaged, mounted securely with no loose fittings, and visibility is not impaired by dirt.',
        ] },
        { name: 'Stop arm', say: [
          'If equipped, the stop arm is mounted securely to the frame, with no loose fittings or damage.',
        ] },
        { name: 'Passenger entry / lift', say: [
          'The entry door is not damaged, operates smoothly, and closes securely from the inside.',
          'Hand rails are secure and the step light works, if equipped.',
          'Entry steps are clear, with treads not loose or excessively worn.',
          'If equipped with a handicap lift: no leaking, damaged, or missing parts; explain how to check it; the lift is fully retracted and latched securely.',
        ] },
        { name: 'Emergency exits', say: [
          'All emergency exits are not damaged, operate smoothly, and close securely from the inside.',
          'Any emergency exit warning devices are working.',
        ] },
        { name: 'Seating', say: [
          'No broken seat frames; frames are firmly attached to the floor.',
          'Seat cushions are attached securely to the seat frames.',
        ] },
      ],
    },
    {
      name: 'Coach / transit bus extras', page: '11-7', rig: 'coach',
      items: [
        { name: 'Passenger entry / lift', say: [
          'Entry doors operate smoothly and close securely from the inside.',
          'Hand rails are secure and the step lights work, if equipped.',
          'Entry steps are clear, with treads not loose or excessively worn.',
          'If equipped with a handicap lift: no leaking, damaged, or missing parts; explain how to check it; the lift is fully retracted and latched securely.',
        ] },
        { name: 'Emergency exits', say: [
          'All emergency exits are not damaged, operate smoothly, and close securely from the inside.',
          'Any emergency exit warning devices are working.',
        ] },
        { name: 'Passenger seating', say: [
          'No broken seat frames; frames are firmly attached to the floor.',
          'Seat cushions are attached securely to the seat frames.',
        ] },
        { name: 'Entry / exit doors and mirrors', say: [
          'Entry and exit doors are not damaged and operate smoothly from the outside; hinges are secure with seals intact.',
          'Passenger exit mirrors and all external mirrors and brackets are not damaged and are mounted securely with no loose fittings.',
        ] },
        { name: 'Level / air leaks', say: [
          'The vehicle sits level, front and rear.',
          'If air-equipped, no audible air leaks from the suspension system.',
        ] },
        { name: 'Fuel tanks', say: [
          'Fuel tanks are secure, with no leaks from tanks or lines.',
        ] },
        { name: 'Baggage compartments', say: [
          'Baggage and all other exterior compartment doors are not damaged, operate properly, and latch securely.',
        ] },
        { name: 'Battery / box', say: [
          'Batteries are secure, connections tight, cell caps present, with no excessive corrosion.',
          'The battery box and its cover or door are not damaged and are secure.',
        ] },
      ],
      note: 'The remainder of the vehicle is inspected the same way as the walk-around groups above.',
    },
  ],
};
