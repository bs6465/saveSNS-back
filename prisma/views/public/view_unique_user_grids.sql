SELECT
  DISTINCT nx,
  ny
FROM
  users_location
WHERE
  (
    (nx IS NOT NULL)
    AND (ny IS NOT NULL)
  );