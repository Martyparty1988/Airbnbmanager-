# Airbnb Villa Reservation Management System

Kompletní systém pro správu rezervací tří Airbnb vil a koordinaci úklidového týmu.

## Funkce

- **Jednotný kalendář**: Integrace iCal feedů ze tří Airbnb nemovitostí
- **Detail rezervací**: Zobrazení dat příjezdu/odjezdu, informací o hostech a typu nemovitosti
- **Interní poznámky**: Přidávání poznámek ke klíčům, úklidu, dodatečným službám
- **Integrace e-mailů**: Automatické parsování e-mailů s rezervačními detaily
- **OpenAI integrace**: Využití AI pro extrakci informací z e-mailů
- **Telegram bot**: Notifikace úklidového týmu o nových rezervacích a speciálních požadavcích
- **Admin dashboard**: Správa e-mailů a API nastavení
- **Denní přehled**: Zobrazení aktuálních příjezdů a odjezdů s detaily včetně kódů k safeboxu
- **Analytický dashboard**: Statistiky obsazenosti a výkonu jednotlivých vil

## Architektura systému

Systém se skládá z:
- **Backend**: Node.js/Express RESTful API
- **Frontend**: React/Next.js s Material UI
- **Databáze**: PostgreSQL
- **Workers**: Background joby pro iCal a zpracování e-mailů
- **Notifikace**: Telegram integrace pro aktualizace úklidového týmu

## Technické požadavky

- Node.js (v16+)
- PostgreSQL (v14+)
- Docker & Docker Compose (pro nasazení)
- E-mailový účet s IMAP/POP3 přístupem
- OpenAI API klíč
- Telegram Bot token a Chat ID

## Instrukce pro nastavení

### 1. Klonování repozitáře

```bash
git clone <adresa-repozitáře>
cd airbnb-villa-manager