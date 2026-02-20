import BACKEND_URL from '../config.js';
import React, { useState } from 'react';
import {Form, Button, Container, Card, Alert, Row, Col} from 'react-bootstrap';
import '../styles/expense.css';
import { useAuth } from '../context/AuthContext.jsx';
// ExpensePage component for adding new expenses and useState for form handling, so setForm is the action where in user inputs the data and the state is being changed from form to setForm
//setForm to update the object when user inputs in the fields

const ExpensePage = () => {
  const { user } = useAuth(); // Get the authenticated user from context
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food', // Default to first option
    date: new Date().toISOString().split('T')[0] // Defaults to today's date
  });

  const [receipt, setReceipt] = useState(null); //stores the actual binary file of the image uploaded by the user.
  const [preview, setPreview] = useState(null); //stores a temporary URL string used to display the image on the screen.
  const [message, setMessage] = useState({ type: '', text: '' }); //manages the Success or Error notifications shown to the user.
  const [isSubmitting, setIsSubmitting] = useState(false); //tracks whether a network request is currently in progress.
// e basically is an object that represents the event that triggered the function, typically an input change event(keystroke)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }; // Updates text/select fields
// e.target.name]: e.target.value basically overwrites old value with the new one and matches the input name
// await fetch-> built in browser function for network requests

//for image receipts
const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
      // Creates a temporary URL to show the image on screen immediately
      setPreview(URL.createObjectURL(file));
    }
  };

  //not  using JSON as image receipts are there which cant be extracted in JSON 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!user?.userId) {
      setMessage({ type: 'danger', text: 'User not identified. Please log in again.' });
      return;
    }
    
    // 3. Constructing FormData for Multipart Upload (Text + File)
    const formData = new FormData();
    formData.append('userId', user.userId); // Include userId in the form data
    formData.append('description', form.description);
    formData.append('amount', form.amount);
    formData.append('category', form.category);
    formData.append('date', form.date);
    if (receipt) formData.append('receipt', receipt);

    try {
      const res = await fetch(`${BACKEND_URL}/expenses`, {
        method: 'POST',
        // Note: Do NOT set 'Content-Type' headers; the browser does it automatically for FormData
        body: formData, 
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Expense added successfully!' });
        setForm({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
        setReceipt(null);
        setPreview(null);
      } else {
        const errorData = await res.json();
        setMessage({ type: 'danger', text: errorData.error || 'Failed to add expense.' });
      }
    } catch {
      setMessage({ type: 'danger', text: 'Connection error. Please check your server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', color: '#0f172a' }}>
        <h3>Loading your profile...</h3>
      </div>
    );
  }

  return (
    <div className="expense-main-content" >
    <div className="expense-form-wrapper" >
      <div className="form-header text-center mb-4">
        <h2 className="display-6 fw-bold text-dark">Add New Expense</h2>
        <p className="text-muted">Fill in the details to track your spending</p>
      </div>

      <Form onSubmit={handleSubmit} className="modern-form">
        <Row className="g-4">
          <Col lg={receipt ? 7 : 12}>
            <Form.Group className='mb-3'>
              <Form.Label className="form-label-custom">Description</Form.Label>
              <Form.Control 
                className="input-custom"
                type="text" name="description" placeholder="What did you spend on?" 
                value={form.description} onChange={handleChange} required 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className='mb-3'>
                  <Form.Label className="form-label-custom">Amount</Form.Label>
                  <Form.Control 
                    className="input-custom"
                    type="number" name="amount" placeholder="0.00" 
                    value={form.amount} onChange={handleChange} required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className='mb-3'>
                  <Form.Label className="form-label-custom">Date</Form.Label>
                  <Form.Control 
                    className="input-custom"
                    type="date" name="date" 
                    value={form.date} onChange={handleChange} required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className='mb-3'>
              <Form.Label className="form-label-custom">Category</Form.Label>
              <Form.Select className="input-custom" name="category" value={form.category} onChange={handleChange}>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Utilities">Utilities</option>
                <option value="Health">Health</option>
                <option value="Education">Education</option>
                <option value="Shopping">Shopping</option>
                <option value="Travel">Travel</option>
                <option value="Savings">Savings</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className='mb-4'>
              <Form.Label className="form-label-custom">Upload Receipt</Form.Label>
              <Form.Control 
                type="file" accept="image/*" 
                onChange={handleFileChange} 
                className="input-custom file-input"
              />
            </Form.Group>
          </Col>

          {/* Receipt Preview Section */}
          {preview && (
            <Col lg={5} className="d-flex flex-column align-items-center justify-content-center border-start ps-lg-4">
              <span className="form-label-custom mb-2">Receipt Preview</span>
              <div className="receipt-preview-container">
                <img src={preview} alt="Receipt" className="img-preview" />
                <button type="button" className="remove-btn" onClick={() => {setPreview(null); setReceipt(null);}}>✕</button>
              </div>
            </Col>
          )}
        </Row>

        <Button className="btn-primary-custom w-100 mt-3" type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Saving' : 'Add Expense'}
        </Button>
      </Form>

      {message.text && <Alert variant={message.type} className="mt-4 border-0 shadow-sm">{message.text}</Alert>}
    </div>
</div>
  );
};

export default ExpensePage;
