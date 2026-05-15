"""Interfaz Streamlit para la calculadora."""
import streamlit as st
from src.calculator import add, subtract, multiply, divide

st.set_page_config(page_title="Calculadora", page_icon="🧮", layout="centered")
st.title("Calculadora")

col1, col2 = st.columns(2)
with col1:
    a = st.number_input("Primer número", value=0.0, format="%g")
with col2:
    b = st.number_input("Segundo número", value=0.0, format="%g")

st.write("")

col_add, col_sub, col_mul, col_div = st.columns(4)
result = None
error = None

if col_add.button("➕ Sumar", use_container_width=True):
    result = add(a, b)
if col_sub.button("➖ Restar", use_container_width=True):
    result = subtract(a, b)
if col_mul.button("✖️ Multiplicar", use_container_width=True):
    result = multiply(a, b)
if col_div.button("➗ Dividir", use_container_width=True):
    try:
        result = divide(a, b)
    except ValueError:
        error = "No se puede dividir por cero"

st.write("")

if error:
    st.error(f"⚠️ {error}", icon="🚫")
elif result is not None:
    st.markdown(
        f"<h1 style='text-align:center; color:#1f77b4;'>= {result:g}</h1>",
        unsafe_allow_html=True,
    )
