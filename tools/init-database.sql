CREATE USER community WITH PASSWORD 'community';

CREATE DATABASE community_app_events
  lc_collate 'fi_FI.UTF-8'
  lc_ctype 'fi_FI.UTF-8'
  encoding 'UTF8'
  template template0;
GRANT ALL PRIVILEGES ON DATABASE community_app_events to community;

CREATE DATABASE community_app_events_test
  lc_collate 'fi_FI.UTF-8'
  lc_ctype 'fi_FI.UTF-8'
  encoding 'UTF8'
  template template0;
GRANT ALL PRIVILEGES ON DATABASE community_events_test to community;
