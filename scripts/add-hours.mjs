import fs from 'fs';

let src = fs.readFileSync('src/app/components/HomeShell.tsx', 'utf8');

// 1. Add hours to PricingTier type
src = src.replace(
  'delivery: string;\n  features: string[];\n};',
  'delivery: string;\n  hours?: string;\n  features: string[];\n};'
);

// 2. Add hours to PriceCard destructuring
src = src.replace(
  '  delivery,\n  features,\n  onTooltipShow,\n  onTooltipHide,',
  '  delivery,\n  hours,\n  features,\n  onTooltipShow,\n  onTooltipHide,'
);

// 3. Add hours to PriceCard type
src = src.replace(
  '  delivery: string;\n  features: string[];\n  onTooltipShow',
  '  delivery: string;\n  hours?: string;\n  features: string[];\n  onTooltipShow'
);

// 4. Add hours render line in PriceCard (after delivery+badge block, before <div className="mb-6">)
const hoursBlock = `        {hours && (
        <div className="flex items-center gap-2 mb-4">
          <svg aria-hidden="true" className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
          <span className="text-teal-400/80 text-xs font-medium">{hours}</span>
        </div>
        )}
`.replace(/\n$/, '');

// Insert hours block before <div className="mb-6"> that follows the delivery+hours section
src = src.replace(
  '        </div>\n        <div className="mb-6">',
  '        </div>\n' + hoursBlock + '\n        <div className="mb-6">'
);

// 5. Add hours to render loop
src = src.replace(
  'delivery={tier.delivery}\n                      onTooltipShow={handleTooltipShow}',
  'delivery={tier.delivery}\n                      hours={tier.hours}\n                      onTooltipShow={handleTooltipShow}'
);

// 6. Update 5 monthly tiers: add hours field and remove from features

// Dev Part-Time (10h)
src = src.replace(
  "features: ['Fino a 10h/settimana, flessibili', 'Code review e documentazione', 'Deploy e CI/CD gestiti', 'Canale Slack dedicato', 'Sprint bisettimanali']",
  "hours: 'Fino a 10h/settimana, flessibili', features: ['Code review e documentazione', 'Deploy e CI/CD gestiti', 'Canale Slack dedicato', 'Sprint bisettimanali']"
);

// Design Partnership (25h)
src = src.replace(
  "features: ['Fino a 25h/settimana, flessibili', 'Brand strategy continuativa', 'Grafiche per social, print, video e web', 'UI/UX design e prototipazione', 'Workshop creativi e report strategico']",
  "hours: 'Fino a 25h/settimana, flessibili', features: ['Brand strategy continuativa', 'Grafiche per social, print, video e web', 'UI/UX design e prototipazione', 'Workshop creativi e report strategico']"
);

// Dev Full-Time (25h)
src = src.replace(
  "features: ['Fino a 25h/settimana, flessibili', 'Tech lead e architettura inclusi', 'Gestione progetto Agile', 'On-call per emergenze', 'Reportistica avanzata']",
  "hours: 'Fino a 25h/settimana, flessibili', features: ['Tech lead e architettura inclusi', 'Gestione progetto Agile', 'On-call per emergenze', 'Reportistica avanzata']"
);

// Web Partnership (40h)
src = src.replace(
  "features: ['Fino a 40h/settimana, flessibili', 'Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale']",
  "hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale']"
);

// Tech Partnership (40h)
src = src.replace(
  "features: ['Fino a 40h/settimana, flessibili', 'Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale']",
  "hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale']"
);

fs.writeFileSync('src/app/components/HomeShell.tsx', src, 'utf8');
console.log('DONE — Hours field added');
