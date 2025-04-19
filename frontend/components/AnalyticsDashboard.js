// frontend/components/AnalyticsDashboard.js
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWithinInterval,
  differenceInDays,
  addMonths,
  subMonths
} from 'date-fns';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Button,
  Stack,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import EuroIcon from '@mui/icons-material/Euro';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#FF5A5F', '#00A699', '#6E27C5', '#FFB400'];

export default function AnalyticsDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  // Fetch reservations for the current month
  const { data: reservations, isLoading, error } = useQuery(
    ['monthlyReservations', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
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
  
  // Fetch all properties
  const { data: properties } = useQuery('properties', async () => {
    const res = await axios.get('/api/properties');
    return res.data;
  });
  
  const handleNavigate = (action) => {
    if (action === 'TODAY') {
      setCurrentDate(new Date());
    } else if (action === 'PREV') {
      setCurrentDate(prevDate => subMonths(prevDate, 1));
    } else if (action === 'NEXT') {
      setCurrentDate(prevDate => addMonths(prevDate, 1));
    }
  };
  
  if (isLoading || !properties) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error">
        Chyba při načítání dat pro analýzu.
      </Alert>
    );
  }
  
  // Calculate statistics
  const calculateOccupancyData = () => {
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const occupancyByProperty = {};
    
    // Initialize occupancy data for each property
    properties.forEach(property => {
      occupancyByProperty[property.id] = 0;
    });
    
    // Count occupied days for each property
    daysInMonth.forEach(day => {
      properties.forEach(property => {
        const isOccupied = reservations.some(reservation => 
          reservation.property_id === property.id &&
          isWithinInterval(day, {
            start: new Date(reservation.arrival_date),
            end: new Date(reservation.departure_date)
          })
        );
        
        if (isOccupied) {
          occupancyByProperty[property.id] += 1;
        }
      });
    });
    
    // Calculate occupancy rate
    const occupancyRate = properties.map(property => ({
      name: property.name,
      value: Math.round((occupancyByProperty[property.id] / daysInMonth.length) * 100)
    }));
    
    return occupancyRate;
  };
  
  const calculateDailyOccupancy = () => {
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    return daysInMonth.map(day => {
      const dayString = format(day, 'yyyy-MM-dd');
      let occupiedCount = 0;
      
      properties.forEach(property => {
        const isOccupied = reservations.some(reservation => 
          reservation.property_id === property.id &&
          isWithinInterval(day, {
            start: new Date(reservation.arrival_date),
            end: new Date(reservation.departure_date)
          })
        );
        
        if (isOccupied) {
          occupiedCount += 1;
        }
      });
      
      return {
        date: format(day, 'd'),
        occupied: occupiedCount,
        total: properties.length
      };
    });
  };
  
  const calculateStayLengthStats = () => {
    if (!reservations || reservations.length === 0) return { average: 0, min: 0, max: 0 };
    
    const stayLengths = reservations.map(reservation => {
      return differenceInDays(
        new Date(reservation.departure_date),
        new Date(reservation.arrival_date)
      );
    });
    
    return {
      average: Math.round(stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length),
      min: Math.min(...stayLengths),
      max: Math.max(...stayLengths)
    };
  };
  
  const calculateReservationsByProperty = () => {
    const countByProperty = {};
    
    properties.forEach(property => {
      countByProperty[property.id] = 0;
    });
    
    reservations.forEach(reservation => {
      if (countByProperty[reservation.property_id] !== undefined) {
        countByProperty[reservation.property_id] += 1;
      }
    });
    
    return properties.map(property => ({
      name: property.name,
      count: countByProperty[property.id]
    }));
  };
  
  const occupancyData = calculateOccupancyData();
  const dailyOccupancy = calculateDailyOccupancy();
  const stayLengthStats = calculateStayLengthStats();
  const reservationsByProperty = calculateReservationsByProperty();
  const totalReservations = reservations.length;
  const totalGuests = reservations.reduce((sum, reservation) => sum + (reservation.guest_count || 0), 0);
  
  // Calculate estimated revenue (based on wellness fee as a proxy)
  const totalRevenue = reservations.reduce((sum, reservation) => sum + (parseFloat(reservation.wellness_fee) || 0), 0);
  
  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h5">
          Statistiky za {format(currentDate, 'MMMM yyyy')}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={() => handleNavigate('TODAY')} title="Dnes">
          <TodayIcon />
        </IconButton>
        <IconButton onClick={() => handleNavigate('PREV')} title="Předchozí měsíc">
          <ArrowBackIcon />
        </IconButton>
        <IconButton onClick={() => handleNavigate('NEXT')} title="Následující měsíc">
          <ArrowForwardIcon />
        </IconButton>
      </Stack>
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Celkem rezervací
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {totalReservations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                v tomto měsíci
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Průměrná délka pobytu
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {stayLengthStats.average}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                dní (min: {stayLengthStats.min}, max: {stayLengthStats.max})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Celkem hostů
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {totalGuests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                v tomto měsíci
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Wellness poplatky
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {totalRevenue.toFixed(0)} €
              </Typography>
              <Typography variant="body2" color="text.secondary">
                v tomto měsíci
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Denní obsazenost
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dailyOccupancy}
                margin={{
                  top: 5,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, properties.length]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupied" name="Obsazených vil" fill="#FF5A5F" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Obsazenost podle vil
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Rezervace podle vil
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={reservationsByProperty}
                margin={{
                  top: 5,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Počet rezervací" fill="#00A699" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}