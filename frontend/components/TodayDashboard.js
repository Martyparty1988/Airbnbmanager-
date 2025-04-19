// frontend/components/TodayDashboard.js
import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const getPropertyColor = (propertyName) => {
  const colors = {
    'Amazing Pool Vila': '#FF5A5F', // Airbnb red
    'Ohyeah Vila': '#00A699', // Airbnb teal
    'The Little Castle Vila': '#6E27C5', // Purple
  };
  return colors[propertyName] || '#888888';
};

export default function TodayDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Fetch today's check-ins and check-outs
  const { data: todayReservations, isLoading, error } = useQuery(
    ['todayReservations', today],
    async () => {
      const res = await axios.get('/api/reservations', {
        params: {
          start_date: today,
          end_date: today
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
  
  // Separate check-ins and check-outs
  const checkIns = todayReservations?.filter(res => res.arrival_date === today) || [];
  const checkOuts = todayReservations?.filter(res => res.departure_date === today) || [];
  
  // Fetch special requests for each reservation
  const { data: specialRequests } = useQuery(
    ['todaySpecialRequests', checkIns.map(r => r.id).join(',')],
    async () => {
      const requests = {};
      
      for (const reservation of checkIns) {
        const res = await axios.get(`/api/reservations/${reservation.id}/special-requests`);
        requests[reservation.id] = res.data;
      }
      
      return requests;
    },
    {
      enabled: checkIns.length > 0
    }
  );
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error">
        Chyba při načítání dnešních rezervací.
      </Alert>
    );
  }
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Dnešní přehled - {format(new Date(), 'd. MMMM yyyy')}
      </Typography>
      
      <Grid container spacing={3}>
        {/* Check-ins Today */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ExitToAppIcon sx={{ mr: 1, transform: 'rotate(180deg)' }} />
              Dnešní příjezdy ({checkIns.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {checkIns.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Dnes nejsou žádné příjezdy.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {checkIns.map(reservation => {
                  const propertyName = properties?.find(p => p.id === reservation.property_id)?.name || 'Neznámá vila';
                  const propertyColor = getPropertyColor(propertyName);
                  const requests = specialRequests?.[reservation.id] || [];
                  
                  return (
                    <Grid item xs={12} key={reservation.id}>
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardHeader
                          avatar={
                            <Avatar sx={{ bgcolor: propertyColor }}>
                              {propertyName.substring(0, 1)}
                            </Avatar>
                          }
                          title={reservation.guest_name}
                          subheader={propertyName}
                        />
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <KeyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body1">
                                  Safebox: <strong>{reservation.safebox_password || 'Není nastaveno'}</strong>
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body1">
                                  Hosté: <strong>{reservation.guest_count || '?'}</strong>
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body1">
                                  Příjezd: <strong>{reservation.arrival_time || 'Neznámý'}</strong>
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Speciální požadavky:
                              </Typography>
                              {requests.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  Žádné požadavky
                                </Typography>
                              ) : (
                                <List dense disablePadding>
                                  {requests.map(request => (
                                    <ListItem key={request.id} disablePadding sx={{ mb: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 30 }}>
                                        <RoomServiceIcon fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText 
                                        primary={request.description}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Paper>
        </Grid>
        
        {/* Check-outs Today */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ExitToAppIcon sx={{ mr: 1 }} />
              Dnešní odjezdy ({checkOuts.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {checkOuts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Dnes nejsou žádné odjezdy.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {checkOuts.map(reservation => {
                  const propertyName = properties?.find(p => p.id === reservation.property_id)?.name || 'Neznámá vila';
                  const propertyColor = getPropertyColor(propertyName);
                  
                  return (
                    <Grid item xs={12} sm={6} key={reservation.id}>
                      <Card variant="outlined">
                        <CardHeader
                          avatar={
                            <Avatar sx={{ bgcolor: propertyColor }}>
                              {propertyName.substring(0, 1)}
                            </Avatar>
                          }
                          title={reservation.guest_name}
                          subheader={propertyName}
                        />
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              Hosté: <strong>{reservation.guest_count || '?'}</strong>
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}