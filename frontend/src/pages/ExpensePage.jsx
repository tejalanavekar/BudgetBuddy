import React, { useState } from 'react';
import {Form, Button, Container, Card, Alert} from 'react-bootstrap';
// ExpensePage component for adding new expenses and useState for form handling, so setForm is the action where in user inputs the data and the state is being changed from form to setForm
//setForm to update the object when user inputs in the fields
const ExpensePage = () => {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food', // Default to first option
    date: ''
  });
  // message state to show success or error messages using useState
const [message, setMessage] = useState('');
// e basically is an object that represents the event that triggered the function, typically an input change event(keystroke)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });// name attribute of the innput field that is being targetted
  };
// e.target.name]: e.target.value basically overwrites old value with the new one and matches the input name
// await fetch-> built in browser function for network requests
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the default form submission behavior(reloading of page after submission)
    try {
      const res = await fetch('http://localhost:5000/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },// data we are sending is in JSON Format
        body: JSON.stringify(form) // Converting the form data to a JSON string
      });
      if (res.ok) {
        setMessage('Expense added successfully!');
        setForm({ description: '', amount: '', category: '', date: '' });
      } else {
        const errorData = await res.json();
        setMessage(`Failed to add expense: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      setMessage('Error connecting to server.');
    }
  };

  return (
    // max width of container is 600px, centered
    <Container className="mt-3" style={{ maxWidth: '600px', margin: '0 auto' }}> 
      <Card>
        <Card.Body>
        {/* //adds margin bottom 4 and centers the title */}
        <Card.Title as="h2" className="text-center mb-3">Add New Expense</Card.Title> 
        <Form onSubmit={handleSubmit}>
          {/* // Grooup acts as wrapper for labels and fields */}
          <Form.Group className='mb-3' controlId='formDescription'> 
            <Form.Label>Description</Form.Label>
          {/* Actual input field */}
            <Form.Control
              type="text"
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className='mb-3' controlId='formAmount'>
            <Form.Label>Amount</Form.Label>
            <Form.Control 
              type="number"
              name="amount"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className='mb-3' controlId='formCategory'>
            <Form.Label>Category</Form.Label>
           <Form.Select name="category" value={form.category} onChange={handleChange} required>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
                
              </Form.Select>
          </Form.Group>

          <Form.Group className='mb-3' controlId='formDate'>
            <Form.Label>Date</Form.Label>
            <Form.Control 
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <div className='d-grid'>
            {/* // Giving the primary bootstrap blue styling to the button */}
            <Button variant='primary' type='submit'>Add Expense</Button> 
        </div>
      </Form>
      {message && <Alert variant="success" className="mt-3">{message}</Alert>}
    </Card.Body>
    </Card>
    </Container>
  );
};
//exporting the component to be used in other parts of the application  
export default ExpensePage;
