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