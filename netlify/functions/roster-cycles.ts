import { builder, type Handler } from "@netlify/functions";
import { Temporal } from 'temporal-polyfill'

/*** Settings **/

// How many cycles before this roster cycle should the calendar start?
const cyclesBehind = 1;
// How many cycles after this roster cycle should the calendar finish?
const cyclesAhead = 20;

// The first roster cycle started on 21 October 1996
const rosterStart = Temporal.PlainDate.from("1996-10-21");

// The domain name to use for uniquely identifying this calendar
const domain = 'calendars.gtch.au';

/*** Implementation ***/

const header: string = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${domain}//Roster-Cycles-v1//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

const footer: string = `END:VCALENDAR
`;


const rosterHandler: Handler = async (event, context) => {
  const calendar = Temporal.Calendar.from('iso8601');
  const today = Temporal.Now.plainDate(calendar);
  const dateTodayStr = today.toString().replace(/-/g,"");

  // Determine the start and end dates of the calendar entries
  const todayDurationSinceRs = today.since(rosterStart);
  const todayDaysSinceRs = todayDurationSinceRs.total({ unit: 'days' });
  const todayCycleNumber = Math.floor(todayDaysSinceRs / 28);
  const startDaysSinceRs = (todayCycleNumber - cyclesBehind) * 28;
  const startDate = rosterStart.add({ days: startDaysSinceRs })
  const endDaysSinceRs = (todayCycleNumber + cyclesAhead +1) * 28;
  const endDate = rosterStart.add({ days: endDaysSinceRs })
  //today.subtract({ months: monthsBehind });
  // const endDate = today.add({ months: monthsAhead });

  // Calculate the period of this calendar
  const durationSinceRs = startDate.since(rosterStart);
  const daysSinceRs = durationSinceRs.total({ unit: 'days' });
  const calendarDuration = endDate.since(startDate);
  const daysToRepeat = calendarDuration.total({ unit: 'days'} );

  // Accumulate the iCal response in a string
  let iCalString = header;

  // Add a VEVENT calendar entry for each day
  for (let day = daysSinceRs; day < daysSinceRs + daysToRepeat; day++) {
    const cycleNumber = Math.floor(day / 28);
    const dayNumber = day % 28 + 1;

    const dateStartStr = rosterStart.add({ days: day }).toString().replace(/-/g,"");
    const dateEndStr = rosterStart.add({ days: day + 1 }).toString().replace(/-/g,"");
    iCalString += `BEGIN:VEVENT
UID:roster-${dateStartStr}@${domain}
DTSTAMP:${dateTodayStr}T000000
DTSTART:${dateStartStr}
DTEND:${dateEndStr}
TRANSP:TRANSPARENT
SUMMARY:RC ${cycleNumber}, Day ${dayNumber}
DESCRIPTION:Day ${dayNumber} of Roster Cycle ${cycleNumber} 
CATEGORIES:ROSTER
END:VEVENT
`;
  }

  iCalString += footer;

  return {
    statusCode: 200,
    ttl: 60 * 60 * 24,  // Refresh once per day
    headers: {
      "Content-Type": "text/calendar",
    },
    // iCal requires that CRLF line breaks are used
    body: iCalString.replace(/\r\n|\r|\n/g,'\r\n'),
  };
};
const handler = builder(rosterHandler);

export { handler };
