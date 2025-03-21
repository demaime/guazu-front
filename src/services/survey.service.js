import { SURVEY_ROUTES } from '@/config/routes';

class SurveyService {
  async getAllSurveys() {
    try {
      console.log('Fetching surveys...');
      
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      console.log('User role:', user.role);
      
      // Usamos la misma ruta para todos los roles, el backend se encarga de filtrar
      const url = SURVEY_ROUTES.BY_ID(user._id);
      
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Survey response:', data);
      
      if (data.error) {
        console.error('Error from API:', data.error);
        return Promise.reject(data.validation);
      }

      // Para todos los roles, las encuestas vienen en data.survey
      const surveys = data.survey || [];

      console.log('Processed surveys:', surveys);
      return { surveys };
    } catch (error) {
      console.error('Error in getAllSurveys:', error);
      throw error;
    }
  }

  async getSurvey(surveyId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(SURVEY_ROUTES.GET(surveyId), {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        return Promise.reject(data.validation);
      }
      
      return {
        survey: data.survey,
        answers: data.answers || []
      };
    } catch (error) {
      console.error('Error in getSurvey:', error);
      throw error;
    }
  }

  async deleteSurvey(surveyId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(SURVEY_ROUTES.DELETE(surveyId), {
        method: 'PUT',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

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
      const response = await fetch(`${SURVEY_ROUTES.ANSWERS(surveyId)}`, {
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