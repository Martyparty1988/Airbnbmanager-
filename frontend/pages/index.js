// frontend/pages/index.js
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ReservationModal from '../components/ReservationModal';
import TodayDashboard from '../components/TodayDashboard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import { enUS } from 'date-fns/locale';

const localizer = dateFnsLocalizer({
  format: (date, formatStr) => format(date, formatStr),
  parse: (str) => new Date(str),
  startOfWeek: () => new Date(),
  getDay: (date) => date.getDay(),
  locales: { 'en-US': enUS },
});

const VIEW_MODES = {
  TODAY: 'today',
  CALENDAR: 'calendar',
  ANALYTICS: 'analytics'
};

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.TODAY);
  
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
  
  const handleChangeView = (event, newValue) => {
    setViewMode(newValue);
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Správa rezervací vil
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tabs value={viewMode} onChange={handleChangeView} aria-label="view modes">
          <Tab 
            icon={<TodayIcon />} 
            label="Dnešní den" 
            value={VIEW_MODES.TODAY}
          />
          <Tab 
            icon={<CalendarMonthIcon />} 
            label="Kalendář" 
            value={VIEW_MODES.CALENDAR}
          />
          <Tab 
            icon={<BarChartIcon />} 
            label="Statistiky" 
            value={VIEW_MODES.ANALYTICS}
          />
        </Tabs>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleSync}
        >
          Synchronizovat
        </Button>
      </Stack>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          Chyba při načítání rezervací. Zkuste to prosím znovu.
        </Alert>
      ) : (
        <>
          {viewMode === VIEW_MODES.TODAY && <TodayDashboard />}
          
          {viewMode === VIEW_MODES.CALENDAR && (
            <>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <IconButton onClick={() => handleNavigate('TODAY')} title="Dnes">
                  <TodayIcon />
                </IconButton>
                <IconButton onClick={() => handleNavigate('PREV')} title="Předchozí měsíc">
                  <ArrowBackIcon />
                </IconButton>
                <IconButton onClick={() => handleNavigate('NEXT')} title="Následující měsíc">
                  <ArrowForwardIcon />
                </IconButton>
                <Typography variant="h6">
                  {format(currentDate, 'MMMM yyyy')}
                </Typography>
              </Stack>
              <Box sx={{ height: 'calc(100vh - 250px)' }}>
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
            </>
          )}
          
          {viewMode === VIEW_MODES.ANALYTICS && <AnalyticsDashboard />}
        </>
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
} Date(str),
  startOfWeek: () => new