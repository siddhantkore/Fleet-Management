"""
Contact management routes.
Handles contact form submissions and inquiries.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContactSubmission
from app.schemas import ContactSubmissionCreate, ContactSubmissionList, ContactSubmissionResponse

# Create router for contact endpoints
router = APIRouter(
    prefix="/contact", tags=["contact"], responses={404: {"description": "Not found"}}
)


@router.post("", response_model=ContactSubmissionResponse, status_code=201)
def create_contact_submission(contact: ContactSubmissionCreate, db: Session = Depends(get_db)):
    """
    Create a new contact submission from the contact form.

    - **name**: Contact person's name
    - **email**: Valid email address
    - **phone**: Phone number (optional)
    - **subject**: Inquiry subject
    - **message**: Detailed message

    Returns the created submission with assigned ID and timestamp.
    """
    try:
        # Create database record
        db_contact = ContactSubmission(
            name=contact.name,
            email=contact.email,
            phone=contact.phone,
            subject=contact.subject,
            message=contact.message,
        )
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)

        # Log submission to console
        _log_contact_submission(contact)

        return db_contact

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving contact submission: {str(e)}")


@router.get("", response_model=list[ContactSubmissionList])
def get_all_contacts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve all contact submissions.

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (default: 100)

    Returns a list of contact submissions (admin endpoint).
    """
    try:
        contacts = db.query(ContactSubmission).offset(skip).limit(limit).all()
        return contacts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving contacts: {str(e)}")


@router.get("/{contact_id}", response_model=ContactSubmissionResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific contact submission by ID.

    Returns the full submission details including message content.
    """
    contact = db.query(ContactSubmission).filter(ContactSubmission.id == contact_id).first()

    if not contact:
        raise HTTPException(
            status_code=404, detail=f"Contact submission with ID {contact_id} not found"
        )

    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    """
    Delete a contact submission by ID (admin endpoint).
    """
    contact = db.query(ContactSubmission).filter(ContactSubmission.id == contact_id).first()

    if not contact:
        raise HTTPException(
            status_code=404, detail=f"Contact submission with ID {contact_id} not found"
        )

    try:
        db.delete(contact)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {str(e)}")


def _log_contact_submission(contact: ContactSubmissionCreate):
    """
    Log contact submission details to console.
    In production, this would be sent to a logging service.
    """
    print("\n" + "=" * 60)
    print("NEW CONTACT SUBMISSION RECEIVED")
    print("=" * 60)
    print(f"Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Name: {contact.name}")
    print(f"Email: {contact.email}")
    print(f"Phone: {contact.phone}")
    print(f"Subject: {contact.subject}")
    print(f"Message:\n{contact.message}")
    print("=" * 60 + "\n")
