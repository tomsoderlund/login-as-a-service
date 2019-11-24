-- Table Definition ----------------------------------------------

CREATE TABLE app (
  id SERIAL PRIMARY KEY,
  name character varying(64),
  slug character varying(64) UNIQUE,
  date_created timestamp with time zone DEFAULT now(),
  redirect_url character varying(128),
  email_domain character varying(64)
);

-- Table Definition ----------------------------------------------

CREATE TABLE person (
  id SERIAL PRIMARY KEY,
  email character varying(128) UNIQUE,
  date_created timestamp with time zone DEFAULT now(),
  first_name character varying(32),
  last_name character varying(32),
  country character varying(2)
);

-- Table Definition ----------------------------------------------

CREATE TABLE person_app (
  person_id integer NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  app_id integer NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  secret character varying(32) DEFAULT md5(random()::text) UNIQUE,
  metadata json
);
