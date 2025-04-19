// frontend/components/Layout.js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Container,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import Link from 'next/link';

const drawerWidth = 240;

export default function Layout({ children }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { name: 'Calendar', icon: <CalendarMonthIcon />, path: '/' },
    { name: 'Admin Settings', icon: <SettingsIcon />, path: '/admin' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Villa Manager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <Link href={item.path} passHref key={item.name}>
            <ListItem 
              button 
              selected={router.pathname === item.path}
              onClick={() => isMobile && handleDrawerToggle()}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItem>
          </Link>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#fff',
          color: '#333',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Airbnb Villa Reservation Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f8f8f8',
        }}
      >
        <Toolbar /> {/* This is for spacing below the AppBar */}
        <Container maxWidth="xl" disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

// frontend/components/ReservationModal.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Divider,
  Tabs,
  Tab,
  Grid,
  Chip,
  Stack,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reservation-tabpanel-${index}`}
      aria-labelledby={`reservation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ReservationModal({ reservation, open, onClose }) {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [newNote, setNewNote] = useState('');
  const [newRequest, setNewRequest] = useState({
    type: 'Other',
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: properties } = useQuery('properties', async () => {
    const res = await axios.get('/api/properties');
    return res.data;
  });

  // Fetch full reservation details with notes and special requests
  const { data: fullReservation, isLoading, refetch } = useQuery(
    ['reservation', reservation?.id],
    async () => {
      const res = await axios.get(`/api/reservations/${reservation.id}`);
      return res.data;
    },
    {
      enabled: !!reservation?.id,
    }
  );

  // Initialize form data when reservation data is loaded
  useEffect(() => {
    if (fullReservation) {
      setFormData({
        property_id: fullReservation.property_id,
        guest_name: fullReservation.guest_name,
        arrival_date: fullReservation.arrival_date,
        departure_date: fullReservation.departure_date,
        guest_count: fullReservation.guest_count || '',
        contact_phone: fullReservation.contact_phone || '',
        wellness_fee: fullReservation.wellness_fee || '',
        safebox_password: fullReservation.safebox_password || '',
        arrival_time: fullReservation.arrival_time || '',
        missing_info: fullReservation.missing_info,
      });
    }
  }, [fullReservation]);

  const updateReservationMutation = useMutation(
    async (data) => {
      const res = await axios.post(`/api/reservations/${reservation.id}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Reservation updated successfully');
        setEditMode(false);
        refetch();
        queryClient.invalidateQueries('reservations');
      },
      onError: (error) => {
        toast.error('Failed to update reservation: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const addNoteMutation = useMutation(
    async (note) => {
      const res = await axios.post(`/api/reservations/${reservation.id}/notes`, note);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Note added successfully');
        setNewNote('');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to add note: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const addRequestMutation = useMutation(
    async (request) => {
      const res = await axios.post(`/api/reservations/${reservation.id}/special-requests`, request);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Special request added successfully');
        setNewRequest({ type: 'Other', description: '' });
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to add special request: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateRequestStatusMutation = useMutation(
    async ({ id, status }) => {
      const res = await axios.post(`/api/special-requests/${id}/status`, { status });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Request status updated');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to update request status: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveReservation = () => {
    updateReservationMutation.mutate(formData);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    addNoteMutation.mutate({
      content: newNote,
      is_internal: true,
    });
  };

  const handleAddRequest = () => {
    if (!newRequest.description.trim()) return;
    
    addRequestMutation.mutate({
      request_type: newRequest.type,
      description: newRequest.description,
      status: 'pending',
    });
  };

  const handleRequestStatusChange = (id, newStatus) => {
    updateRequestStatusMutation.mutate({ id, status: newStatus });
  };

  if (!reservation || !fullReservation) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Reservation Details
          </Typography>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="reservation tabs">
            <Tab label="Details" />
            <Tab label="Notes" />
            <Tab label="Special Requests" />
          </Tabs>
        </Box>
        
        {/* Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">
                  {fullReservation.guest_name}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={editMode ? <SaveIcon /> : <EditIcon />}
                  onClick={() => editMode ? handleSaveReservation() : setEditMode(true)}
                >
                  {editMode ? 'Save Changes' : 'Edit'}
                </Button>
              </Stack>
              
              {fullReservation.missing_info && (
                <Chip 
                  label="Missing Information" 
                  color="warning" 
                  sx={{ mb: 2 }} 
                />
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Property
              </Typography>
              {editMode ? (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Property</InputLabel>
                  <Select
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleInputChange}
                  >
                    {properties?.map(property => (
                      <MenuItem key={property.id} value={property.id}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="body1">
                  {fullReservation.property_name}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Guest Name
              </Typography>
              {editMode ? (
                <TextField
                  name="guest_name"
                  value={formData.guest_name}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.guest_name}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Check-in Date
              </Typography>
              {editMode ? (
                <TextField
                  name="arrival_date"
                  type="date"
                  value={formData.arrival_date}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {format(new Date(fullReservation.arrival_date), 'PPP')}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Check-out Date
              </Typography>
              {editMode ? (
                <TextField
                  name="departure_date"
                  type="date"
                  value={formData.departure_date}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {format(new Date(fullReservation.departure_date), 'PPP')}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Number of Guests
              </Typography>
              {editMode ? (
                <TextField
                  name="guest_count"
                  type="number"
                  value={formData.guest_count}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.guest_count || 'Not specified'}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Contact Phone
              </Typography>
              {editMode ? (
                <TextField
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.contact_phone || 'Not provided'}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Wellness Fee
              </Typography>
              {editMode ? (
                <TextField
                  name="wellness_fee"
                  type="number"
                  value={formData.wellness_fee}
                  onChange={handleInputChange}
                  InputProps={{ startAdornment: '€' }}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.wellness_fee ? `€${fullReservation.wellness_fee}` : 'Not set'}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Safebox Password
              </Typography>
              {editMode ? (
                <TextField
                  name="safebox_password"
                  value={formData.safebox_password}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.safebox_password || 'Not set'}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Arrival Time
              </Typography>
              {editMode ? (
                <TextField
                  name="arrival_time"
                  type="time"
                  value={formData.arrival_time}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />
              ) : (
                <Typography variant="body1">
                  {fullReservation.arrival_time || 'Not specified'}
                </Typography>
              )}
            </Grid>
            
            {editMode && (
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>Mark as missing information:</Typography>
                    <Select
                      name="missing_info"
                      value={formData.missing_info}
                      onChange={handleInputChange}
                      size="small"
                    >
                      <MenuItem value={true}>Yes</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                    </Select>
                  </Stack>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        {/* Notes Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add New Note
            </Typography>
            <TextField
              label="Note content"
              multiline
              rows={3}
              fullWidth
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter note about keys, cleaning, or special arrangements..."
              margin="normal"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              sx={{ mt: 1 }}
            >
              Add Note
            </Button>
          </Paper>
          
          <Typography variant="h6" gutterBottom>
            Notes History
          </Typography>
          
          {fullReservation.notes && fullReservation.notes.length > 0 ? (
            <List>
              {fullReservation.notes.map((note) => (
                <ListItem key={note.id} divider>
                  <ListItemText
                    primary={note.content}
                    secondary={format(new Date(note.created_at), 'PPp')}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No notes added yet.
            </Typography>
          )}
        </TabPanel>
        
        {/* Special Requests Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add New Special Request
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Description"
                  fullWidth
                  margin="normal"
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  placeholder="Describe the request details..."
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRequest}
              disabled={!newRequest.description.trim()}
              sx={{ mt: 1 }}
            >
              Add Request
            </Button>
          </Paper>
          
          <Typography variant="h6" gutterBottom>
            Special Requests
          </Typography>
          
          {fullReservation.special_requests && fullReservation.special_requests.length > 0 ? (
            <List>
              {fullReservation.special_requests.map((request) => (
                <ListItem key={request.id} divider>
                  <ListItemText
                    primary={
                      <Typography>
                        <strong>{request.request_type}:</strong> {request.description}
                      </Typography>
                    }
                    secondary={format(new Date(request.created_at), 'PPp')}
                  />
                  <FormControl sx={{ minWidth: 120, ml: 2 }}>
                    <Select
                      value={request.status}
                      size="small"
                      onChange={(e) => handleRequestStatusChange(request.id, e.target.value)}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No special requests added yet.
            </Typography>
          )}
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Request Type</InputLabel>
                  <Select
                    value={newRequest.type}
                    onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                  >
                    <MenuItem value="Beer Keg">Beer Keg</MenuItem>
                    <MenuItem value="Extra Bedding">Extra Bedding</MenuItem>
                    <MenuItem value="Special Food">Special Food</MenuItem>
                    <MenuItem value="Transportation">Transportation</MenuItem>
                    <MenuItem value="Cleaning">Cleaning</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={