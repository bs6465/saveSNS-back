SELECT
  users.user_id,
  users.nx,
  users.ny,
  weather_ultra.fcst_datetime,
  weather_ultra.t1h,
  weather_ultra.rn1,
  weather_ultra.sky,
  weather_ultra.uuu,
  weather_ultra.vvv,
  weather_ultra.reh,
  weather_ultra.pty,
  weather_ultra.lgt,
  weather_ultra.vec,
  weather_ultra.wsd
FROM
  (
    users_location users
    JOIN weather_ultra_short_term_forecast weather_ultra ON (
      (
        (users.nx = weather_ultra.nx)
        AND (users.ny = weather_ultra.ny)
      )
    )
  );