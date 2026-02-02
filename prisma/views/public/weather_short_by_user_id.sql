SELECT
  users.user_id,
  users.nx,
  users.ny,
  weather_short.fcst_datetime,
  weather_short.tmp,
  weather_short.uuu,
  weather_short.vvv,
  weather_short.vec,
  weather_short.wsd,
  weather_short.sky,
  weather_short.pty,
  weather_short.pop,
  weather_short.wav,
  weather_short.pcp,
  weather_short.reh,
  weather_short.sno,
  weather_short.tmn,
  weather_short.tmx
FROM
  (
    users_location users
    JOIN weather_short_term_forecast weather_short ON (
      (
        (users.nx = weather_short.nx)
        AND (users.ny = weather_short.ny)
      )
    )
  );