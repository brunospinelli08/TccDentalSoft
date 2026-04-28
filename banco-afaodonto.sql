create database AFA;
use AFA;

create table usuarios (
id int auto_increment primary key,
nome varchar(100) not null,
email varchar(100) UNIQUE,
senha varchar(255) not null, 
tipo ENUM('admin','dentista','funcionario') UNIQUE,  /*lista de opcoes fixas */
ativo boolean default true,  /*verdadeiro ou falso */
criado_em timestamp default current_timestamp  /*momento atual automatico*/
);

alter table usuarios
modify tipo ENUM('admin','dentista','funcionario') UNIQUE;

create table funcionarios (
id int auto_increment primary key,
nome varchar(100) not null,
cpf varchar(14) unique,
telefone varchar(100) not null,
cargo varchar(50) not null,
salario decimal(10,2) not null,
data_contratacao date,
ativo boolean default true 
);



create table pacientes (
id int auto_increment primary key,
nome varchar(100),
cpf varchar(14) UNIQUE,
data_nascimento date not null,
telefone varchar(20) not null,
email varchar(100) not null,
endereco text not null,
criado_em timestamp default current_timestamp 
);


create table tratamentos (
id int auto_increment primary key,
nome varchar(100) not null,
descricao text not null,
valor_base decimal(10,2)
);


create table consultas (
id int auto_increment primary key,
pacientes_id int not null,
funcionarios_id int not null,
tratamentos_id int not null,
data datetime,
status ENUM('agendada','realizada','cancelada') UNIQUE,
observacoes text,
foreign key (pacientes_id) references pacientes(id),
foreign key (funcionarios_id) references funcionarios(id),
foreign key (tratamentos_id) references tratamentos(id)
);

alter table consultas
modify status ENUM('agendada','realizada','cancelada') UNIQUE;

create table pagamentos (
id int auto_increment primary key,
consultas_id int not null,
valor_bruto decimal(10,2) not null,
desconto decimal(10,2) not null,
valor_liquido decimal(10,2) not null,
forma_pagamento ENUM('dinheiro','cartao','pix') UNIQUE,
data_pagamento datetime not null,
foreign key (consultas_id) references consultas(id)
);


create table despesas (
id int auto_increment primary key,
descricao varchar(100) not null,
valor decimal(10,2) not null,
categoria varchar(50),
data date
);

create table parcelas (
id int auto_increment primary key,
pagamentos_id int not null,
numero_parcelas int not null,
valor decimal(10,2),
data_vencimento date not null,
status ENUM('pendente','pagp','atrasado'),
data_pagamento date,
foreign key (pagamentos_id) references pagamentos(id)
);

create table fluxo_caixa (
id int auto_increment primary key, 
tipo ENUM('entrada','saida') UNIQUE,
tabela_referencia varchar(50) not null,
valor decimal(10,2) not null,
data DATETIME not null
);

drop table fluxo_caixa;


create table agendas (
id int auto_increment primary key,
data date not null,
hora time not null,
disponivel boolean default true not null
);

drop table agendas;