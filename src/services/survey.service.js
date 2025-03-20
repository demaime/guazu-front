import { API_URL } from '@/config/constants';

class SurveyService {
  async getAllSurveys() {
    try {
      console.log('Fetching surveys...');
      
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      console.log('User role:', user.role);
      
      let url;
      // Los pollster ven las encuestas que les fueron asignadas
      if (user.role === 'POLLSTER') {
        url = `${API_URL}/surveyByUserId`;
      }
      // Los supervisores y admin ven todas las encuestas que pueden gestionar
      else {
        url = `${API_URL}/survey/${user._id}`;
      }
      
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      console.log('Survey response:', data);
      
      if (data.error) {
        console.error('Error from API:', data.error);
        return Promise.reject(data.validation);
      }

      // Para POLLSTER, las encuestas vienen en data.surveysByPollsterId
      // Para ADMIN/SUPERVISOR, vienen en data.survey (en singular)
      const surveys = user.role === 'POLLSTER' 
        ? (data.surveysByPollsterId || [])
        : (data.survey || []);

      console.log('Processed surveys:', surveys);
      return { surveys };
    } catch (error) {
      console.error('Error in getAllSurveys:', error);
      throw error;
    }
  }

  async deleteSurvey(surveyId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/delete-survey/${surveyId}`, {
        method: 'PUT',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      
      if (data.error) {
        return Promise.reject(data.validation);
      }
      
      return data;
    } catch (error) {
      console.error('Error in deleteSurvey:', error);
      throw error;
    }
  }

  async deleteAnswers(surveyId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/answers/${surveyId}`, {
        method: 'DELETE',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      
      if (data.error) {
        return Promise.reject(data.validation);
      }
      
      return data;
    } catch (error) {
      console.error('Error in deleteAnswers:', error);
      throw error;
    }
  }
}

export const surveyService = new SurveyService(); 