import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';

interface Breadcrumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  action,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
}) {
  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="パンくずリスト">
          {breadcrumbs.map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} underline="hover">
                {item.label}
              </Link>
            ) : (
              <Typography key={item.label} color="text.secondary">
                {item.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ alignSelf: { sm: 'center' } }}>{action}</Box>}
      </Stack>
    </Stack>
  );
}
