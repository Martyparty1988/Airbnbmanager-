// frontend/pages/_app.js
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../components/Layout';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF5A5F', // Airbnb red
    },
    secondary: {
      main: '#00A699', // Airbnb teal
    },
    background: {
      default: '#f8f8f8',
    },
  },
  typography: {
    fontFamily: 'Circular, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif',
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <ToastContainer position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default MyApp;

// frontend/pages/index.js
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ReservationModal from '../components/ReservationModal';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import { enUS } from 'date-fns/locale';

const localizer = dateFnsLocalizer({
  format: (date, formatStr) => format(date, formatStr),
  parse: (str) => new Date(str),
  startOfWeek: () => new Date(),
  getDay: (date) => date.getDay(),
  locales: { 'en-US': enUS },
});

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState(null);
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(addMonths(currentDate, 2)); // Show 3 months
  
  const { data: reservations, isLoading, error, refetch } = useQuery(
    ['reservations', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    async () => {
      const res = await axios.get('/api/reservations', {
        params: {
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        }
      });
      return res.data;
    }
  );
  
  const { data: properties } = useQuery('properties', async () => {
    const res = await axios.get('/api/properties');
    return res.data;
  });
  
  const handleSync = async () => {
    try {
      await axios.post('/api/sync/ical');
      refetch();
    } catch (error) {
      console.error('Error syncing calendars:', error);
    }
  };
  
  const formatEvents = () => {
    if (!reservations || !properties) return [];
    
    const propColors = {
      'Amazing Pool Vila': '#FF5A5F', // Airbnb red
      'Ohyeah Vila': '#00A699', // Airbnb teal
      'The Little Castle Vila': '#6E27C5', // Purple
    };
    
    return reservations.map(reservation => {
      const property = properties.find(p => p.id === reservation.property_id);
      const propertyName = property ? property.name : 'Unknown Villa';
      
      return {
        id: reservation.id,
        title: `${propertyName} - ${reservation.guest_name}`,
        start: new Date(reservation.arrival_date),
        end: new Date(reservation.departure_date),
        resource: reservation,
        backgroundColor: propColors[propertyName] || '#888888',
      };
    });
  };
  
  const handleSelectEvent = (event) => {
    setSelectedReservation(event.resource);
  };
  
  const handleCloseModal = () => {
    setSelectedReservation(null);
    refetch();
  };
  
  const handleNavigate = (action) => {
    if (action === 'TODAY') {
      setCurrentDate(new Date());
    } else if (action === 'PREV') {
      setCurrentDate(prevDate => addMonths(prevDate, -1));
    } else if (action === 'NEXT') {
      setCurrentDate(prevDate => addMonths(prevDate, 1));
    }
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Villa Reservations Calendar
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={() => handleNavigate('TODAY')} title="Today">
          <TodayIcon />
        </IconButton>
        <IconButton onClick={() => handleNavigate('PREV')} title="Previous month">
          <ArrowBackIcon />
        </IconButton>
        <IconButton onClick={() => handleNavigate('NEXT')} title="Next month">
          <ArrowForwardIcon />
        </IconButton>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleSync}
        >
          Sync Calendar
        </Button>
      </Stack>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          Error loading reservations. Please try again.
        </Alert>
      ) : (
        <Box sx={{ height: 'calc(100vh - 180px)' }}>
          <Calendar
            localizer={localizer}
            events={formatEvents()}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.backgroundColor,
                borderRadius: '4px',
              },
            })}
            views={['month', 'week', 'agenda']}
            defaultView="month"
          />
        </Box>
      )}
      
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          open={!!selectedReservation}
          onClose={handleCloseModal}
        />
      )}
    </Box>
  );
}

// frontend/pages/admin.js
import React from 'react';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import SyncIcon from '@mui/icons-material/Sync';

export default function Admin() {
  const { data: settings, isLoading, refetch } = useQuery('settings', async () => {
    const res = await axios.get('/api/settings');
    return res.data;
  });

  const updateSettingsMutation = useMutation(
    async (newSettings) => {
      const res = await axios.post('/api/settings', newSettings);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Settings updated successfully');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to update settings: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const testTelegramMutation = useMutation(
    async () => {
      const res = await axios.post('/api/test/telegram');
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Telegram test message sent successfully');
      },
      onError: (error) => {
        toast.error('Failed to send Telegram test: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const syncEmailMutation = useMutation(
    async () => {
      const res = await axios.post('/api/sync/email');
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Email sync triggered successfully');
      },
      onError: (error) => {
        toast.error('Failed to trigger email sync: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleSaveSettings = (section, data) => {
    const updateData = {};
    
    // Handle different setting sections
    if (section === 'email') {
      updateData.email_server = data.server;
      updateData.email_user = data.user;
      if (data.password && data.password !== '******') {
        updateData.email_password = data.password;
      }
      updateData.email_protocol = data.protocol;
    } else if (section === 'openai') {
      if (data.apiKey && data.apiKey !== '******') {
        updateData.openai_api_key = data.apiKey;
      }
    }
    
    updateSettingsMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Email Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Email Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleSaveSettings('email', {
                server: formData.get('email_server'),
                user: formData.get('email_user'),
                password: formData.get('email_password'),
                protocol: formData.get('email_protocol')
              });
            }}>
              <Stack spacing={2}>
                <TextField
                  name="email_server"
                  label="Email Server"
                  fullWidth
                  defaultValue={settings?.email_server || ''}
                  required
                  placeholder="imap.gmail.com"
                />
                
                <TextField
                  name="email_user"
                  label="Email User"
                  fullWidth
                  defaultValue={settings?.email_user || ''}
                  required
                  placeholder="your@email.com"
                />
                
                <TextField
                  name="email_password"
                  label="Email Password"
                  type="password"
                  fullWidth
                  defaultValue={settings?.email_password ? '******' : ''}
                  required
                  placeholder="Password"
                />
                
                <FormControl fullWidth>
                  <InputLabel>Protocol</InputLabel>
                  <Select
                    name="email_protocol"
                    defaultValue={settings?.email_protocol || 'imap'}
                  >
                    <MenuItem value="imap">IMAP</MenuItem>
                    <MenuItem value="pop3">POP3</MenuItem>
                  </Select>
                </FormControl>
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    type="submit"
                  >
                    Save Email Settings
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={() => syncEmailMutation.mutate()}
                    disabled={syncEmailMutation.isLoading}
                  >
                    Sync Emails
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Paper>
        </Grid>

        {/* OpenAI Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              OpenAI API Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleSaveSettings('openai', {
                apiKey: formData.get('openai_api_key')
              });
            }}>
              <Stack spacing={2}>
                <TextField
                  name="openai_api_key"
                  label="OpenAI API Key"
                  fullWidth
                  defaultValue={settings?.openai_api_key ? '******' : ''}
                  required
                  placeholder="sk-..."
                />
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  type="submit"
                >
                  Save OpenAI Settings
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid>

        {/* Telegram Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Telegram Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <TextField
                label="Telegram Bot Token"
                fullWidth
                value={settings?.telegram_token || ''}
                disabled
              />
              
              <TextField
                label="Telegram Chat ID"
                fullWidth
                value={settings?.telegram_chat_id || ''}
                disabled
              />
              
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SendIcon />}
                onClick={() => testTelegramMutation.mutate()}
                disabled={testTelegramMutation.isLoading}
              >
                Test Telegram Integration
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}