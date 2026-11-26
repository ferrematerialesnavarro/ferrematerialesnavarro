
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS clientes (
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id) BETWEEN 8 AND 80),
 nombre TEXT NOT NULL CHECK(length(trim(nombre)) BETWEEN 2 AND 100),
 telefono TEXT NOT NULL DEFAULT '' CHECK(length(telefono)<=30),
 caja TEXT NOT NULL CHECK(caja IN ('COMPUTADORA','PABLO','DIANA','GOLI')),
 creado TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS movimientos (
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id) BETWEEN 8 AND 80),
 cliente TEXT NOT NULL REFERENCES clientes(id),
 caja TEXT NOT NULL CHECK(caja IN ('COMPUTADORA','PABLO','DIANA','GOLI')),
 tipo TEXT NOT NULL CHECK(tipo IN ('venta','abono')),
 centavos INTEGER NOT NULL CHECK(centavos BETWEEN 1 AND 10000000000),
 metodo TEXT NOT NULL CHECK((tipo='venta' AND metodo='credit') OR (tipo='abono' AND metodo IN ('cash','card','transfer'))),
 ticket TEXT UNIQUE,
 fecha TEXT NOT NULL,
 recibido TEXT NOT NULL,
 CHECK((tipo='venta' AND ticket IS NOT NULL) OR (tipo='abono' AND ticket IS NULL))
) STRICT;
CREATE INDEX IF NOT EXISTS movimientos_cliente ON movimientos(cliente,fecha);
CREATE INDEX IF NOT EXISTS movimientos_caja ON movimientos(caja,fecha);
CREATE TRIGGER IF NOT EXISTS movimientos_no_sobregiro
 BEFORE INSERT ON movimientos WHEN NEW.tipo='abono'
 BEGIN
 SELECT CASE WHEN NEW.centavos > COALESCE((SELECT SUM(CASE WHEN tipo='venta' THEN centavos ELSE -centavos END)
 FROM movimientos WHERE cliente=NEW.cliente),0) THEN RAISE(ABORT,'El abono supera el saldo disponible') END;
 END;
CREATE TRIGGER IF NOT EXISTS movimientos_inmutables_update BEFORE UPDATE ON movimientos
 BEGIN SELECT RAISE(ABORT,'Movimiento inmutable'); END;
CREATE TRIGGER IF NOT EXISTS movimientos_inmutables_delete BEFORE DELETE ON movimientos
 BEGIN SELECT RAISE(ABORT,'Movimiento inmutable'); END;
CREATE VIEW IF NOT EXISTS saldos_clientes AS
 SELECT c.id,c.nombre,c.telefono,COALESCE(SUM(CASE WHEN m.tipo='venta' THEN m.centavos ELSE 0 END),0) AS ventas,
 COALESCE(SUM(CASE WHEN m.tipo='abono' THEN m.centavos ELSE 0 END),0) AS abonos,
 COALESCE(SUM(CASE WHEN m.tipo='venta' THEN m.centavos ELSE -m.centavos END),0) AS saldo
 FROM clientes c LEFT JOIN movimientos m ON m.cliente=c.id GROUP BY c.id;
