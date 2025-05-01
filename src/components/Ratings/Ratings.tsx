import React, { useEffect, useState } from "react";
import EventCard, { EventItem } from "./EventCard";
import { SimplePool, Event } from "nostr-tools";
import { Notes } from "../Notes";

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const pool = new SimplePool();
      //   await pool.connect();
      const filters = [
        {
          kinds: [1, 0], // Fetching notes (kind 1) and profiles (kind 0)
          limit: 10,
        },
      ];
      pool.subscribeMany(["wss://relay.damus.io"], filters, {
        onevent: (event: Event) => {
          setEvents((prevEvents) => [...prevEvents, event]);
        },
      });
    };

    fetchEvents();
  }, []);

  return (
    <>
      {events.map((event) => (
        <Notes event={event} />
        // <EventCard key={event.id} event={event} onRate={() => {}} />
      ))}
    </>
  );
};

export default EventList;
